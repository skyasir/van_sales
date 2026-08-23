/** Typed-by-convention wrappers over the van_sales whitelisted methods. */

import { request } from "./request"

const M = "van_sales.api"

export const api = {
	bootstrap: () => request(`${M}.session.bootstrap`),

	ping: () => request(`${M}.auth.ping`),

	receivablesSummary: (args = {}) => request(`${M}.customers.receivables_summary`, { args }),

	listCustomers: (args) => request(`${M}.customers.list_customers`, { args }),

	customerSnapshot: (customer, company) =>
		request(`${M}.customers.snapshot`, { args: { customer, company } }),

	statement: (customer, company) =>
		request(`${M}.customers.statement`, { args: { customer, company } }),

	openInvoices: (customer, company) =>
		request(`${M}.customers.open_invoices`, { args: { customer, company } }),

	resolveBarcode: (args) => request(`${M}.catalog.resolve_barcode`, { args }),

	searchItems: (args) => request(`${M}.catalog.search_items`, { args }),

	vanStock: (warehouse) => request(`${M}.catalog.van_stock`, { args: { warehouse } }),

	quote: (payload) => request(`${M}.selling.quote`, { args: { payload } }),

	createInvoice: (payload) =>
		request(`${M}.selling.create_invoice`, { method: "POST", args: { payload } }),

	createReturn: (payload) =>
		request(`${M}.selling.create_return`, { method: "POST", args: { payload } }),

	invoiceForPrint: (name) => request(`${M}.selling.invoice_for_print`, { args: { name } }),

	createReceipt: (payload) =>
		request(`${M}.payments.create_receipt`, { method: "POST", args: { payload } }),

	suggestAllocation: (customer, amount, company) =>
		request(`${M}.payments.suggest_allocation`, { args: { customer, amount, company } }),

	myCollections: (args = {}) => request(`${M}.payments.my_collections`, { args }),

	getProfile: () => request(`${M}.profile.get_profile`),

	updateProfile: (payload) =>
		request(`${M}.profile.update_profile`, { method: "POST", args: { payload } }),

	/** Drops this user's key pair server-side, signing every device out. */
	revokeAllDevices: () => request(`${M}.auth.revoke`, { method: "POST" }),

	changePassword: (args) => request(`${M}.profile.change_password`, { method: "POST", args }),

	/**
	 * Simple lookups go through the endpoint the desk itself uses, so
	 * results, ordering and user permissions behave identically to a Link
	 * field on a Sales Invoice.
	 */
	searchLink: (doctype, txt, filters) =>
		request("frappe.desk.search.search_link", {
			args: { doctype, txt, filters: filters ? JSON.stringify(filters) : undefined },
		}),
}
