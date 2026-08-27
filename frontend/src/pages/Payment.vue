<template>
	<!--
		Settle the sale.

		One document. The payment goes on the invoice itself, so a cash sale is
		a single post that either succeeds completely or leaves nothing behind
		-- there is no window where the customer has an invoice but no receipt,
		or a receipt against an invoice that failed.

		The client UID is generated once when this screen opens, so a retry
		after a timeout resolves to that same invoice rather than charging
		twice.
	-->
	<div>
		<PageHeader title="Payment" :subtitle="cart.customer?.customer_name ?? ''" back />

		<ScreenBody v-if="!cart.customer || !cart.lines.length">
			<Alert
				theme="blue"
				title="Nothing to settle"
				:dismissable="false"
				description="Pick a customer and scan at least one item first."
			/>
			<Button
				variant="solid"
				theme="blue"
				class="h-touch"
				@click="router.replace({ name: 'invoice' })"
			>
				Back to the invoice
			</Button>
		</ScreenBody>

		<ScreenBody v-else>
			<MoneyPanel>
				<div class="flex flex-col items-center">
					<p class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-gray-5">
						Amount due
					</p>
					<p
						class="money mt-1.5 text-[40px] font-semibold -tracking-[0.03em] text-ink-gray-9"
					>
						{{ money(total) }}
					</p>
					<p class="mt-0.5 text-[11.5px] text-ink-gray-5">
						{{ session.van?.currency }} · {{ cart.lines.length }} lines
					</p>
				</div>
			</MoneyPanel>

			<TabButtons v-model="tender" class="w-full" :buttons="TENDERS" />

			<div
				v-if="tender === 'cash'"
				class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
			>
				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
					Cash tendered
				</p>
				<input
					v-model="tendered"
					type="text"
					inputmode="decimal"
					:placeholder="money(total)"
					class="money mt-2 h-14 w-full rounded-xl border border-outline-gray-2 bg-surface-gray-1 px-3.5 text-2xl font-semibold text-ink-gray-8 placeholder:text-ink-gray-4 focus:border-outline-blue-1 focus:outline-none"
				/>

				<div class="mt-3 flex gap-[7px]">
					<button
						v-for="(preset, i) in cashPresets"
						:key="i"
						type="button"
						class="money flex h-10 flex-1 items-center justify-center rounded-[9px] border border-outline-gray-2 bg-surface-white text-[13.5px] font-semibold text-ink-gray-8 active:bg-surface-gray-2"
						@click="tendered = String(Math.round(preset))"
					>
						{{ i === 0 ? "Exact" : money(preset, 0) }}
					</button>
				</div>

				<div
					class="mt-3 flex items-center justify-between border-t border-outline-gray-1 pt-3"
				>
					<span class="text-[13px] text-ink-gray-6">Change due</span>
					<span class="money text-base font-semibold text-ink-green-3">{{
						money(change)
					}}</span>
				</div>
			</div>

			<div
				v-if="tender === 'cheque'"
				class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
			>
				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
					Cheque details
				</p>
				<div class="mt-2 flex flex-col gap-3">
					<FormControl
						v-model="chequeNo"
						label="Cheque number"
						type="text"
						size="md"
						placeholder="004518"
					/>
					<FormControl v-model="valueDate" label="Value date" type="date" size="md" />
				</div>
				<p class="mt-3 text-[12px] leading-[18px] text-ink-gray-6">
					Leave the value date today for a cheque you are banking now. A future date makes
					it post-dated, and a post-dated cheque cannot settle the invoice — record it
					from the customer's Collect payment screen instead, so it is held until it
					clears.
				</p>
			</div>

			<Alert
				v-if="tender === 'credit' && quote"
				:theme="quote.credit.over_limit ? 'yellow' : 'blue'"
				:title="creditTitle"
				:dismissable="false"
				:description="creditBody"
			/>

			<Alert
				v-if="error"
				theme="red"
				title="Not posted"
				:dismissable="false"
				:description="error"
			/>

			<Button
				class="h-[54px]"
				:variant="tender === 'credit' ? 'solid' : 'solid'"
				:theme="tender === 'credit' ? 'blue' : 'green'"
				:loading="busy"
				:disabled="busy || creditBlocked || !quote"
				@click="post"
			>
				{{ tender === "credit" ? "Post on credit" : "Post & print receipt" }}
			</Button>
		</ScreenBody>
	</div>
</template>

<script setup>
import { Alert, Button, FormControl, TabButtons } from "frappe-ui"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import MoneyPanel from "../components/MoneyPanel.vue"
import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { cart, clear, subtotal, toPayloadItems } from "../data/cart"
import { money } from "../data/format"
import { capturedAt, captureGeo, newClientUid } from "../data/geo"
import { ApiError } from "../data/request"
import { policy, session } from "../data/session"

const router = useRouter()

const TENDERS = [
	{ label: "Cash", value: "cash" },
	{ label: "Cheque", value: "cheque" },
	{ label: "Credit", value: "credit" },
]

const tender = ref("cash")
const tendered = ref("")
const chequeNo = ref("")
const valueDate = ref("")
const quote = ref(null)
const busy = ref(false)
const error = ref(null)

// Fixed for the life of this screen: a retry must reuse it, or the server
// cannot tell the retry from a second sale.
const invoiceUid = newClientUid()

watch(
	() => [cart.customer?.name, JSON.stringify(toPayloadItems())],
	async () => {
		if (!cart.customer || !cart.lines.length) return
		try {
			quote.value = await api.quote({
				customer: cart.customer.name,
				profile: session.van?.profile,
				items: toPayloadItems(),
			})
		} catch (e) {
			error.value = e instanceof ApiError ? e.message : "Could not price the basket."
		}
	},
	{ immediate: true },
)

const total = computed(() => quote.value?.grand_total ?? subtotal.value)

const tenderedValue = computed(() => Number(String(tendered.value).replace(/,/g, "")) || 0)
const change = computed(() => Math.max(0, tenderedValue.value - total.value))

const cashPresets = computed(() => [total.value, 500, 1000, 2000])

const modeName = computed(() => {
	const modes = session.van?.payment_modes ?? []
	if (tender.value === "cash") {
		return modes.find((m) => /cash/i.test(m.mode_of_payment))?.mode_of_payment ?? "Cash"
	}
	return modes.find((m) => /cheque|check/i.test(m.mode_of_payment))?.mode_of_payment ?? "Cheque"
})

const creditBlocked = computed(
	() =>
		tender.value === "credit" &&
		Boolean(quote.value?.credit?.over_limit) &&
		Boolean(quote.value?.credit?.blocks_credit_sale),
)

const creditTitle = computed(() =>
	quote.value.credit.over_limit
		? `Balance after this sale: ${money(quote.value.credit.balance_after)}`
		: "Posting on terms",
)

const creditBody = computed(() => {
	const credit = quote.value.credit
	if (!credit.over_limit) {
		return "The invoice stays outstanding against the customer, with no receipt raised."
	}
	return (
		`That is ${money(credit.over_by)} past the ${money(credit.limit, 0)} limit. ` +
		(credit.blocks_credit_sale
			? "The server will refuse this sale on credit."
			: "It will post but be flagged.")
	)
})

async function post() {
	if (!cart.customer || !session.van) return

	busy.value = true
	error.value = null

	try {
		const geo = await captureGeo(Boolean(policy.value.capture_gps))
		const stamp = capturedAt()

		// Cash and cheque ride on the invoice itself, so the sale is one
		// document that comes back Paid. A credit sale carries no payment and
		// is simply left outstanding, which is the point of terms.
		//
		// Cash is sent as tendered, not capped at the total: ERPNext works out
		// the change from it, and the receipt should show what the customer
		// actually handed over.
		const payments =
			tender.value === "credit"
				? []
				: [
						{
							mode_of_payment: modeName.value,
							amount:
								tender.value === "cash"
									? tenderedValue.value || total.value
									: total.value,
							reference_no:
								tender.value === "cheque" ? chequeNo.value || undefined : undefined,
							reference_date:
								tender.value === "cheque"
									? valueDate.value || undefined
									: undefined,
						},
					]

		const invoice = await api.createInvoice({
			client_uid: invoiceUid,
			customer: cart.customer.name,
			profile: session.van.profile,
			items: toPayloadItems(),
			payments,
			on_credit: tender.value === "credit",
			submit: 1,
			geo,
			captured_at: stamp,
		})

		clear()
		router.replace({ name: "receipt", params: { name: invoice.name } })
	} catch (e) {
		error.value = e instanceof ApiError ? e.message : "Could not post the sale."
	} finally {
		busy.value = false
	}
}
</script>
