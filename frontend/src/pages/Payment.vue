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
			<Banner
				variant="info"
				title="Nothing to settle"
				body="Pick a customer and scan at least one item first."
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
					<p class="text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">
						Amount due
					</p>
					<p class="money mt-1.5 text-[40px] font-semibold -tracking-[0.03em] text-white">
						{{ money(total) }}
					</p>
					<p class="mt-0.5 text-[11.5px] text-white/50">
						{{ session.van?.currency }} · {{ cart.lines.length }} lines
					</p>
				</div>
			</MoneyPanel>

			<div class="flex gap-2">
				<button
					v-for="option in TENDERS"
					:key="option.key"
					type="button"
					class="flex h-touch flex-1 items-center justify-center rounded-xl border text-[14px] font-bold"
					:class="
						tender === option.key
							? 'border-brand bg-brand-wash text-brand-dark'
							: 'border-van-border bg-van-card text-van-text'
					"
					@click="tender = option.key"
				>
					{{ option.label }}
				</button>
			</div>

			<div v-if="tender === 'cash'" class="van-card p-3.5">
				<p class="section-label">Cash tendered</p>
				<input
					v-model="tendered"
					type="text"
					inputmode="decimal"
					:placeholder="money(total)"
					class="money mt-2 h-14 w-full rounded-xl border border-van-border bg-van-bg px-3.5 text-2xl font-semibold text-van-text placeholder:text-van-placeholder focus:border-brand focus:outline-none"
				/>

				<div class="mt-3 flex gap-[7px]">
					<button
						v-for="(preset, i) in cashPresets"
						:key="i"
						type="button"
						class="money flex h-10 flex-1 items-center justify-center rounded-[9px] border border-van-border bg-van-card text-[13.5px] font-semibold text-van-text active:bg-van-subtle"
						@click="tendered = String(Math.round(preset))"
					>
						{{ i === 0 ? "Exact" : money(preset, 0) }}
					</button>
				</div>

				<div class="mt-3 flex items-center justify-between border-t border-van-subtle pt-3">
					<span class="text-[13px] text-van-muted">Change due</span>
					<span class="money text-base font-semibold text-ok">{{ money(change) }}</span>
				</div>
			</div>

			<div v-if="tender === 'cheque'" class="van-card p-3.5">
				<p class="section-label">Cheque details</p>
				<div class="mt-2 flex flex-col gap-3">
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-van-muted">Cheque number</span>
						<input
							v-model="chequeNo"
							type="text"
							inputmode="numeric"
							placeholder="004518"
							class="money h-12 rounded-xl border border-van-border bg-van-bg px-3.5 text-[15px] text-van-text placeholder:text-van-placeholder focus:border-brand focus:outline-none"
						/>
					</label>
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-van-muted">Value date</span>
						<input
							v-model="valueDate"
							type="date"
							class="money h-12 rounded-xl border border-van-border bg-van-bg px-3.5 text-[15px] text-van-text focus:border-brand focus:outline-none"
						/>
					</label>
				</div>
				<p class="mt-3 text-[12px] leading-[18px] text-van-muted">
					Leave the value date today for a cheque you are banking now. A future date makes
					it post-dated, and a post-dated cheque cannot settle the invoice — record it
					from the customer's Collect payment screen instead, so it is held until it
					clears.
				</p>
			</div>

			<Banner
				v-if="tender === 'credit' && quote"
				:variant="quote.credit.over_limit ? 'warning' : 'info'"
				:title="creditTitle"
				:body="creditBody"
			/>

			<Banner v-if="error" variant="danger" title="Not posted" :body="error" />

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
import { Button } from "frappe-ui"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import Banner from "../components/Banner.vue"
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
	{ key: "cash", label: "Cash" },
	{ key: "cheque", label: "Cheque" },
	{ key: "credit", label: "Credit" },
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
