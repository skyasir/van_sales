"""Item lookup for the sell screens.

Scanning is the primary input, so ``resolve_barcode`` is the endpoint that
matters: one scan has to return the item, the UOM that barcode represents,
the price for this customer and what is physically on the van. Anything
less and the rep ends up typing.

Pricing goes through ERPNext's own ``get_item_details`` rather than reading
Item Price directly, so pricing rules, customer price lists, UOM conversion
and item tax templates behave exactly as they do on the desk.
"""

import frappe
from frappe import _
from frappe.utils import cint, flt, nowdate

from van_sales.api.utils import default_company, setting


def _van_qty(item_code: str, warehouse: str) -> float:
	"""What is actually on the van right now."""
	if not warehouse:
		return 0.0

	qty = frappe.db.get_value(
		"Bin", {"item_code": item_code, "warehouse": warehouse}, "actual_qty"
	)
	return flt(qty)


def _price_for(item_code: str, ctx: dict) -> dict:
	from erpnext.stock.get_item_details import get_item_details

	args = frappe._dict(
		{
			"item_code": item_code,
			"doctype": "Sales Invoice",
			"company": ctx["company"],
			"customer": ctx.get("customer"),
			"warehouse": ctx.get("warehouse"),
			"selling_price_list": ctx.get("price_list"),
			"price_list_currency": ctx.get("currency"),
			"plc_conversion_rate": 1.0,
			"conversion_rate": 1.0,
			"currency": ctx.get("currency"),
			"qty": flt(ctx.get("qty")) or 1,
			"uom": ctx.get("uom"),
			"stock_qty": flt(ctx.get("qty")) or 1,
			"transaction_date": nowdate(),
			"is_pos": 0,
			"ignore_pricing_rule": 0,
			"update_stock": cint(ctx.get("update_stock")),
			"name": None,
		}
	)

	try:
		details = get_item_details(args)
	except Exception:
		# A missing price list entry should not stop the rep from scanning --
		# they can still see the item and the server will price it on post.
		frappe.log_error(
			title="Van Sales: item pricing failed",
			message=f"{item_code}\n{frappe.get_traceback()}",
		)
		return {}

	return {
		"rate": flt(details.get("price_list_rate")),
		"net_rate": flt(details.get("rate")),
		"discount_percentage": flt(details.get("discount_percentage")),
		"uom": details.get("uom"),
		"conversion_factor": flt(details.get("conversion_factor")) or 1,
		"item_tax_template": details.get("item_tax_template"),
		"income_account": details.get("income_account"),
		"cost_center": details.get("cost_center"),
		"has_batch_no": cint(details.get("has_batch_no")),
		"has_serial_no": cint(details.get("has_serial_no")),
	}


def _item_payload(item: dict, ctx: dict, matched_uom: str | None = None) -> dict:
	pricing_ctx = {**ctx, "uom": matched_uom or item.get("stock_uom")}
	price = _price_for(item["name"], pricing_ctx)

	return {
		"item_code": item["name"],
		"item_name": item.get("item_name"),
		"description": item.get("description"),
		"item_group": item.get("item_group"),
		"image": item.get("image"),
		"stock_uom": item.get("stock_uom"),
		"uom": price.get("uom") or matched_uom or item.get("stock_uom"),
		"conversion_factor": price.get("conversion_factor", 1),
		"rate": price.get("rate", 0.0),
		"net_rate": price.get("net_rate", 0.0),
		"has_batch_no": price.get("has_batch_no", cint(item.get("has_batch_no"))),
		"has_serial_no": price.get("has_serial_no", cint(item.get("has_serial_no"))),
		"item_tax_template": price.get("item_tax_template"),
		"van_qty": _van_qty(item["name"], ctx.get("warehouse")),
	}


@frappe.whitelist()
def resolve_barcode(
	barcode: str,
	warehouse: str | None = None,
	customer: str | None = None,
	price_list: str | None = None,
	company: str | None = None,
	currency: str | None = None,
):
	"""Turn one scan into a priced, stock-checked invoice line."""
	if not cint(setting("enable_barcode_scanning", 1)):
		frappe.throw(_("Barcode scanning is turned off in Van Sales Settings."))

	if not barcode:
		frappe.throw(_("No barcode supplied."))

	match = frappe.db.get_value(
		"Item Barcode",
		{"barcode": barcode.strip(), "parenttype": "Item"},
		["parent", "uom", "barcode_type"],
		as_dict=True,
	)

	if not match:
		# Warehouse labels often print the item code rather than a registered
		# barcode, so trying it as a code turns a dead end into a hit.
		if cint(setting("barcode_fallback_to_item_code", 1)) and frappe.db.exists(
			"Item", {"name": barcode.strip(), "disabled": 0}
		):
			match = frappe._dict({"parent": barcode.strip(), "uom": None, "barcode_type": None})
		else:
			return {"found": False, "barcode": barcode}

	item = frappe.db.get_value(
		"Item",
		match.parent,
		[
			"name",
			"item_name",
			"description",
			"item_group",
			"image",
			"stock_uom",
			"has_batch_no",
			"has_serial_no",
			"disabled",
			"is_sales_item",
		],
		as_dict=True,
	)

	if not item or cint(item.disabled):
		return {"found": False, "barcode": barcode}

	if not cint(item.is_sales_item):
		frappe.throw(_("{0} is not a sales item.").format(item.item_name or item.name))

	ctx = {
		"company": company or default_company(),
		"customer": customer,
		"warehouse": warehouse,
		"price_list": price_list,
		"currency": currency,
	}

	return {
		"found": True,
		"barcode": barcode,
		"barcode_type": match.barcode_type,
		"item": _item_payload(item, ctx, matched_uom=match.uom),
	}


@frappe.whitelist()
def search_items(
	query: str | None = None,
	warehouse: str | None = None,
	customer: str | None = None,
	price_list: str | None = None,
	company: str | None = None,
	currency: str | None = None,
	in_stock_only: int = 0,
	limit: int = 25,
):
	"""Typed search, deliberately the secondary path to scanning."""
	if not cint(setting("allow_manual_item_search", 1)):
		frappe.throw(
			_("Manual item search is turned off. Scan the item instead."),
			title=_("Scan Required"),
		)

	filters = {"disabled": 0, "is_sales_item": 1}

	or_filters = None
	if query:
		or_filters = {
			"name": ("like", f"%{query}%"),
			"item_name": ("like", f"%{query}%"),
			"item_group": ("like", f"%{query}%"),
		}

	items = frappe.get_all(
		"Item",
		filters=filters,
		or_filters=or_filters,
		fields=[
			"name",
			"item_name",
			"description",
			"item_group",
			"image",
			"stock_uom",
			"has_batch_no",
			"has_serial_no",
		],
		order_by="item_name asc",
		limit_page_length=cint(limit) or 25,
	)

	ctx = {
		"company": company or default_company(),
		"customer": customer,
		"warehouse": warehouse,
		"price_list": price_list,
		"currency": currency,
	}

	results = [_item_payload(item, ctx) for item in items]

	if cint(in_stock_only):
		results = [row for row in results if row["van_qty"] > 0]

	return {"items": results}


@frappe.whitelist()
def van_stock(warehouse: str, include_zero: int = 0):
	"""Everything currently on the van, for the stock tab and par checks."""
	if not frappe.has_permission("Warehouse", "read", doc=warehouse):
		frappe.throw(_("Not permitted to read this warehouse."), frappe.PermissionError)

	filters = {"warehouse": warehouse}
	if not cint(include_zero):
		filters["actual_qty"] = ("!=", 0)

	bins = frappe.get_all(
		"Bin",
		filters=filters,
		fields=["item_code", "actual_qty", "reserved_qty", "stock_uom", "valuation_rate"],
		limit_page_length=0,
	)

	if not bins:
		# Same shape as the populated return -- a caller reading total_value on
		# an empty van should get 0, not undefined.
		return {"warehouse": warehouse, "items": [], "total_value": 0.0}

	names = [b.item_code for b in bins]
	item_names = dict(
		frappe.get_all(
			"Item",
			filters={"name": ("in", names)},
			fields=["name", "item_name"],
			as_list=True,
			limit_page_length=0,
		)
	)

	rows = [
		{
			"item_code": b.item_code,
			"item_name": item_names.get(b.item_code, b.item_code),
			"qty": flt(b.actual_qty),
			"reserved_qty": flt(b.reserved_qty),
			"uom": b.stock_uom,
			"value": flt(b.actual_qty) * flt(b.valuation_rate),
		}
		for b in bins
	]
	rows.sort(key=lambda r: r["item_name"])

	return {
		"warehouse": warehouse,
		"items": rows,
		"total_value": sum(r["value"] for r in rows),
	}
