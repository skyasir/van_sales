/** Number and date formatting, kept identical everywhere money is shown. */

export function money(value, precision = 2) {
	const n = Number(value ?? 0)
	if (!Number.isFinite(n)) return "0.00"
	return n.toLocaleString("en-AE", {
		minimumFractionDigits: precision,
		maximumFractionDigits: precision,
	})
}

/** Compact form for dashboard tiles: 1.84M, 742k, 9,120. */
export function compact(value) {
	const n = Number(value ?? 0)
	const abs = Math.abs(n)
	if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
	if (abs >= 10_000) return `${Math.round(n / 1_000)}k`
	return money(n, 0)
}

export function qty(value) {
	const n = Number(value ?? 0)
	return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "")
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "08 Aug" / "08 Aug 2026" -- unambiguous for a UAE/India mixed team. */
export function shortDate(value, withYear = false) {
	if (!value) return "—"
	const d = new Date(String(value).replace(" ", "T"))
	if (Number.isNaN(d.getTime())) return String(value)
	const base = `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`
	return withYear ? `${base} ${d.getFullYear()}` : base
}

export function timeOfDay(value) {
	if (!value) return ""
	const d = new Date(String(value).replace(" ", "T"))
	if (Number.isNaN(d.getTime())) return ""
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function daysOverdueLabel(days) {
	if (!days || days <= 0) return "Current"
	return `${days}d overdue`
}

/** Today, in the shape Frappe's Date field accepts. */
export function today() {
	const d = new Date()
	const pad = (n) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
