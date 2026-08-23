/**
 * The invoice being built at a stop.
 *
 * Deliberately dumb about money: it tracks what was scanned and how many,
 * and asks the server for the priced total. The only figure it computes
 * locally is the subtotal, which is a hint while the rep is still scanning.
 */

import { computed, reactive } from "vue"

const state = reactive({
	customer: null,
	lines: [],
})

export const cart = state

export const subtotal = computed(() =>
	state.lines.reduce((sum, line) => sum + line.rate * line.qty, 0),
)

export const count = computed(() => state.lines.length)

export function setCustomer(next) {
	// Switching customer mid-basket would silently reprice everything, so the
	// basket is dropped rather than carried across.
	if (state.customer && next && state.customer.name !== next.name) state.lines = []
	state.customer = next
}

export function addItem(item, qty = 1) {
	const existing = state.lines.find((line) => line.item_code === item.item_code)
	if (existing) {
		existing.qty += qty
		return
	}
	state.lines.push({
		item_code: item.item_code,
		item_name: item.item_name,
		uom: item.uom,
		rate: item.rate,
		qty,
		van_qty: item.van_qty,
		batch_no: null,
	})
}

export function setQty(itemCode, qty) {
	const line = state.lines.find((l) => l.item_code === itemCode)
	if (!line) return
	line.qty = Math.max(0, qty)
	if (line.qty === 0) remove(itemCode)
}

export function increment(itemCode, by) {
	const line = state.lines.find((l) => l.item_code === itemCode)
	if (!line) return
	setQty(itemCode, line.qty + by)
}

export function remove(itemCode) {
	state.lines = state.lines.filter((line) => line.item_code !== itemCode)
}

export function clear() {
	state.lines = []
	state.customer = null
}

/** Lines in the shape the API expects. */
export function toPayloadItems() {
	return state.lines.map((line) => ({
		item_code: line.item_code,
		qty: line.qty,
		uom: line.uom,
		batch_no: line.batch_no ?? undefined,
	}))
}
