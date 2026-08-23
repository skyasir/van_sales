import frappe
from frappe.boot import load_translations

no_cache = 1


def get_context(context):
	"""Hand the SPA its CSRF token and enough boot data to render offline.

	The app is served from the site itself, so it rides the ordinary session
	cookie. Without the CSRF token here every POST -- posting an invoice,
	taking a payment -- would be refused.
	"""
	csrf_token = frappe.sessions.get_csrf_token()
	frappe.db.commit()  # nosemgrep

	context = frappe._dict()
	context.csrf_token = csrf_token
	context.site_name = frappe.local.site
	context.boot = get_boot()
	return context


def get_boot():
	bootinfo = frappe._dict(
		{
			"site_name": frappe.local.site,
			"default_route": "/van_sales",
		}
	)

	load_translations(bootinfo)

	# load_translations sets lang itself, to a LocalProxy. The boot block is
	# serialised with Jinja's tojson, which refuses one -- so coerce it after
	# the call, never before.
	bootinfo.lang = str(bootinfo.lang)

	return bootinfo
