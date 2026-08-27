<template>
	<!--
		The invoice being built.

		Shaped like a Sales Invoice on the desk: a Customer link field at the
		top, then item rows, then totals. Tapping Customer or Add item opens a
		picker rather than navigating away, so the document on screen is never
		lost while choosing something for it. Anyone who fills in a Sales
		Invoice in ERPNext should recognise the flow without being taught it.

		Totals are never computed here. Every change asks the server to price
		the basket, so the tax and total the rep reads are the figures the
		invoice will post with, pricing rules and all.
	-->
	<div class="flex min-h-full flex-col">
		<PageHeader title="New invoice" :subtitle="headerSubtitle" />

		<div class="flex-1">
			<ScreenBody>
				<!-- Customer ------------------------------------------------- -->
				<div
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
				>
					<LinkAutocomplete
						label="Customer"
						placeholder="Select a customer"
						:model-value="customerOption"
						:fetch="searchCustomerOptions"
						@update:model-value="pickCustomer"
					/>

					<p v-if="customerDescription" class="mt-2 text-p-sm text-ink-gray-5">
						{{ customerDescription }}
					</p>

					<p
						v-if="cart.customer && cart.customer.credit_limit > 0"
						class="mt-2 text-xs text-ink-gray-6"
					>
						Limit {{ money(cart.customer.credit_limit, 0) }} · headroom
						{{ money(cart.customer.credit_headroom ?? 0, 0) }}
					</p>
				</div>

				<!-- Items --------------------------------------------------- -->
				<div class="flex items-center justify-between">
					<span class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5"
						>Items</span
					>
					<span v-if="cart.lines.length" class="text-xs font-semibold text-ink-gray-5">
						{{ cart.lines.length }} {{ cart.lines.length === 1 ? "line" : "lines" }}
					</span>
				</div>

				<EmptyState v-if="!cart.lines.length" :text="emptyText" />

				<template v-else>
					<div
						v-for="line in cart.lines"
						:key="line.item_code"
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
					>
						<div class="flex gap-2.5">
							<div class="min-w-0 flex-1">
								<p
									class="text-[14.5px] font-semibold leading-[19px] text-ink-gray-8"
								>
									{{ line.item_name }}
								</p>
								<p
									class="money mt-1 truncate text-[11.5px] font-medium text-ink-gray-5"
								>
									{{ line.item_code }} · {{ line.uom }} · {{ money(line.rate) }}
								</p>
							</div>
							<button
								type="button"
								class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-outline-gray-2 active:bg-surface-gray-2"
								:aria-label="`Remove ${line.item_name}`"
								@click="remove(line.item_code)"
							>
								<FeatherIcon name="x" class="h-4 w-4 text-ink-gray-5" />
							</button>
						</div>

						<div class="mt-3 flex items-center justify-between">
							<QtyStepper
								:model-value="line.qty"
								:label="line.item_name"
								:min="1"
								@update:model-value="(v) => setQty(line.item_code, v)"
							/>

							<div class="text-right">
								<p class="money text-[17px] font-semibold text-ink-gray-8">
									{{ money(line.rate * line.qty) }}
								</p>
								<!-- Selling past what the van holds is allowed but never
								     silent: the rep is told before they post, not after
								     the stock ledger refuses it. -->
								<p
									class="mt-0.5 text-[11px] font-semibold"
									:class="
										line.qty > line.van_qty
											? 'text-ink-amber-3'
											: 'text-ink-gray-4'
									"
								>
									{{
										line.qty > line.van_qty
											? "over van stock"
											: `van ${qty(line.van_qty)}`
									}}
								</p>
							</div>
						</div>
					</div>
				</template>

				<!-- Adding a line. Scanning is the fast path when it is on, but
				     there is always a way in that does not depend on it. -->
				<div class="flex gap-2.5">
					<div v-if="manualSearch" class="flex-1">
						<LinkAutocomplete
							placeholder="Add item"
							:model-value="null"
							:fetch="searchItemOptions"
							@update:model-value="pickItem"
						/>
					</div>
					<Button
						v-if="scanning"
						class="h-touch flex-1"
						variant="solid"
						theme="blue"
						@click="goScan"
					>
						Scan
					</Button>
				</div>

				<Alert v-if="error" theme="red" title="Pricing failed" :dismissable="false"
					:description="error"
				/>
			</ScreenBody>
		</div>

		<!-- Totals ------------------------------------------------------ -->
		<div
			v-if="cart.lines.length"
			class="sticky bottom-0 border-t border-outline-gray-2 bg-surface-white p-3.5 pb-4"
		>
			<div class="mb-1 flex justify-between">
				<span class="text-[13px] text-ink-gray-6">
					{{ quote ? "Net total" : "Running subtotal" }}
				</span>
				<span class="money text-[13px] font-medium text-ink-gray-6">
					{{ money(quote?.net_total ?? subtotal) }}
				</span>
			</div>

			<div v-for="(tax, i) in quote?.taxes ?? []" :key="i" class="mb-1 flex justify-between">
				<span class="text-[13px] text-ink-gray-6">{{ tax.description }}</span>
				<span class="money text-[13px] font-medium text-ink-gray-6">{{
					money(tax.amount)
				}}</span>
			</div>

			<div
				class="mt-2 flex items-baseline justify-between border-t border-outline-gray-1 pt-2"
			>
				<span class="text-[15px] font-semibold text-ink-gray-8">Total</span>
				<span class="money text-2xl font-semibold -tracking-[0.02em] text-ink-gray-8">
					{{ pricing && !quote ? "—" : money(quote?.grand_total ?? subtotal) }}
				</span>
			</div>

			<Alert
				v-if="quote?.credit?.over_limit"
				class="mt-2"
				theme="yellow"
				:title="`Exceeds credit limit by ${money(quote.credit.over_by)}`"
				:dismissable="false"
				:description="
					quote.credit.blocks_credit_sale
						? 'Cash settlement is allowed. A credit sale will be refused.'
						: 'A credit sale is allowed but will be flagged.'
				"
			/>

			<Button
				class="mt-3 h-[54px] w-full"
				variant="solid"
				theme="blue"
				:loading="pricing && !quote"
				:disabled="!canContinue"
				@click="router.push({ name: 'payment' })"
			>
				{{ pricing ? "Pricing…" : "Continue to payment" }}
			</Button>
		</div>

		<!-- Customer picker --------------------------------------------- -->

		<!-- Item picker -------------------------------------------------- -->
	</div>
</template>

<script setup>
import { Alert, Button, FeatherIcon } from "frappe-ui"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import EmptyState from "../components/EmptyState.vue"
import LinkAutocomplete from "../components/LinkAutocomplete.vue"
import PageHeader from "../components/PageHeader.vue"
import QtyStepper from "../components/QtyStepper.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { addItem, cart, remove, setCustomer, setQty, subtotal, toPayloadItems } from "../data/cart"
import { money, qty } from "../data/format"
import { ApiError } from "../data/request"
import { policy, session } from "../data/session"

const router = useRouter()

const quote = ref(null)
const pricing = ref(false)
const error = ref(null)

const scanning = computed(() => policy.value.barcode_scanning ?? true)
const manualSearch = computed(() => policy.value.manual_item_search ?? true)

const headerSubtitle = computed(() =>
	session.van ? `${session.van.profile} · ${session.van.warehouse_name}` : "",
)

const customerOption = computed(() =>
	cart.customer ? { label: cart.customer.customer_name, value: cart.customer.name } : null,
)

const customerDescription = computed(() =>
	cart.customer ? `${cart.customer.name} · ${money(cart.customer.outstanding)} outstanding` : "",
)

const emptyText = computed(() =>
	scanning.value || manualSearch.value
		? "No items yet. Add one to start the invoice."
		: "No way to add items is enabled on this site.",
)

const canContinue = computed(
	() => Boolean(cart.customer) && cart.lines.length > 0 && Boolean(quote.value) && !pricing.value,
)

// Every change reprices against the server. A local total would drift from
// the posted document the moment a pricing rule applied.
let priceToken = 0

watch(
	() => [cart.customer?.name, JSON.stringify(toPayloadItems()), session.van?.profile],
	async () => {
		if (!cart.customer || cart.lines.length === 0) {
			quote.value = null
			return
		}

		const mine = ++priceToken
		pricing.value = true
		error.value = null

		try {
			const result = await api.quote({
				customer: cart.customer.name,
				profile: session.van?.profile,
				items: toPayloadItems(),
			})
			if (mine !== priceToken) return
			quote.value = result
		} catch (e) {
			if (mine !== priceToken) return
			quote.value = null
			error.value = e instanceof ApiError ? e.message : "Could not price this basket."
		} finally {
			if (mine === priceToken) pricing.value = false
		}
	},
	{ immediate: true },
)

/** Autocomplete wants {label, value}; the rest of the row rides along. */
async function searchCustomerOptions(query) {
	const result = await api.listCustomers({ search: query || undefined, limit: 40 })
	return result.customers.map((c) => ({ ...c, label: c.customer_name, value: c.name }))
}

async function searchItemOptions(query) {
	const result = await api.searchItems({
		query: query || undefined,
		warehouse: session.van?.warehouse,
		customer: cart.customer?.name,
		price_list: session.van?.price_list,
		company: session.van?.company,
		currency: session.van?.currency,
		limit: 40,
	})
	return result.items.map((i) => ({
		...i,
		label: i.item_name,
		value: i.item_code,
		description: `${i.item_code} · ${money(i.rate)} · van ${qty(i.van_qty)}`,
	}))
}

async function pickCustomer(option) {
	if (!option?.value) return setCustomer(null)
	// The option is enough to display, but the sell flow needs the full credit
	// position, so read the same snapshot the customer screen uses.
	try {
		setCustomer(await api.customerSnapshot(option.value))
	} catch {
		setCustomer({ ...option, name: option.value, default_price_list: null, blocked: false })
	}
}

function pickItem(option) {
	if (option?.value) addItem(option, 1)
}

function goScan() {
	router.push({ name: "scan" })
}
</script>
