<template>
	<!--
		Viewing a posted invoice.

		Reachable from anywhere an invoice number appears -- a customer's
		statement, their recent activity, or straight after a sale. Before this
		existed the number was printed on screen but could not be opened, which
		is the sort of dead end that makes a rep phone the office.

		Printing is offered here, never required. It is a secondary action and
		its absence must not stop anyone reading, sharing or acting on the
		invoice.
	-->
	<div>
		<PageHeader :title="invoiceName" :subtitle="d?.customer_name ?? ''" back />

		<ScreenBody>
			<div v-if="doc.loading.value && !d" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
			</div>

			<ErrorState
				v-else-if="doc.error.value"
				:message="doc.error.value"
				:offline="doc.offline.value"
				:on-retry="doc.reload"
			/>

			<template v-else-if="d">
				<MoneyPanel>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<p
								class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-gray-5"
							>
								{{ d.is_return ? "Credit note" : "Tax invoice" }}
							</p>
							<p
								class="money mt-1 truncate text-[15px] font-semibold text-ink-gray-9"
							>
								{{ d.name }}
							</p>
							<p class="mt-0.5 text-[11.5px] text-ink-gray-5">
								{{ shortDate(d.posting_date, true)
								}}{{ d.due_date ? ` · due ${shortDate(d.due_date, true)}` : "" }}
							</p>
						</div>
						<Badge :theme="statusVariant" variant="subtle" size="lg">{{
							d.status || "—"
						}}</Badge>
					</div>

					<div class="mt-4 flex justify-between">
						<div>
							<p
								class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-gray-5"
							>
								Total
							</p>
							<p class="money mt-1 text-2xl font-semibold text-ink-gray-9">
								{{ money(d.rounded_total) }}
							</p>
						</div>
						<div class="text-right">
							<p
								class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-gray-5"
							>
								Outstanding
							</p>
							<p
								class="money mt-1 text-2xl font-semibold"
								:class="
									d.outstanding_amount > 0 ? 'text-ink-red-2' : 'text-ink-green-2'
								"
							>
								{{ money(d.outstanding_amount) }}
							</p>
						</div>
					</div>
				</MoneyPanel>

				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">Items</p>

				<div
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
				>
					<div
						v-for="(item, i) in d.items"
						:key="i"
						class="flex gap-2.5 py-2"
						:class="i ? 'border-t border-outline-gray-1' : ''"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-[14px] font-semibold text-ink-gray-8">
								{{ item.item_name }}
							</p>
							<p class="money mt-0.5 text-[11.5px] text-ink-gray-5">
								{{ qty(item.qty) }} {{ item.uom }} × {{ money(item.rate) }}
							</p>
						</div>
						<span class="money shrink-0 text-[14px] font-semibold text-ink-gray-8">
							{{ money(item.amount) }}
						</span>
					</div>

					<div class="mt-2 border-t border-outline-gray-1 pt-2">
						<div class="flex justify-between">
							<span class="text-[13px] text-ink-gray-6">Net total</span>
							<span class="money text-[13px] font-medium text-ink-gray-6">
								{{ money(d.net_total) }}
							</span>
						</div>
						<div v-for="(tax, i) in d.taxes" :key="i" class="mt-1 flex justify-between">
							<span class="text-[13px] text-ink-gray-6">{{ tax.description }}</span>
							<span class="money text-[13px] font-medium text-ink-gray-6">
								{{ money(tax.amount) }}
							</span>
						</div>
						<div
							class="mt-2 flex items-baseline justify-between border-t border-outline-gray-1 pt-2"
						>
							<span class="text-[15px] font-semibold text-ink-gray-8"
								>Total {{ d.currency }}</span
							>
							<span class="money text-xl font-semibold text-ink-gray-8">
								{{ money(d.rounded_total) }}
							</span>
						</div>
					</div>
				</div>

				<template v-if="d.payments.length">
					<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
						Payment
					</p>
					<div
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
					>
						<div
							v-for="(p, i) in d.payments"
							:key="i"
							class="flex justify-between py-1.5"
						>
							<span class="text-[13px] text-ink-gray-6">
								{{ p.mode_of_payment
								}}{{ p.reference_no ? ` · ${p.reference_no}` : "" }}
							</span>
							<span class="money text-[14px] font-semibold text-ink-gray-8">{{
								money(p.amount)
							}}</span>
						</div>
						<div v-if="d.change_amount > 0" class="flex justify-between py-1.5">
							<span class="text-[13px] text-ink-gray-6">Change given</span>
							<span class="money text-[14px] font-semibold text-ink-green-3">
								{{ money(d.change_amount) }}
							</span>
						</div>
					</div>
				</template>

				<!-- A credit note only makes sense against a submitted sale, and
				     never against another credit note. -->
				<Button
					v-if="d.docstatus === 1 && !d.is_return"
					class="h-touch !text-ink-red-3"
					variant="outline"
					@click="router.push({ name: 'credit-note', params: { invoice: d.name } })"
				>
					Create credit note
				</Button>

				<div class="flex gap-2.5">
					<Button class="h-touch flex-1" variant="outline" @click="share">Share</Button>
					<Button class="h-touch flex-1" variant="outline" disabled>Print</Button>
				</div>

				<div class="flex gap-2">
					<FeatherIcon name="info" class="mt-0.5 h-4 w-4 shrink-0 text-ink-gray-5" />
					<p class="text-[11.5px] leading-[17px] text-ink-gray-5">
						Printing needs a paired thermal printer, which is not built yet. Share sends
						the same details as text in the meantime.
					</p>
				</div>
			</template>
		</ScreenBody>
	</div>
</template>

<script setup>
import { Badge, Button, FeatherIcon, LoadingIndicator, toast } from "frappe-ui"
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import ErrorState from "../components/ErrorState.vue"
import MoneyPanel from "../components/MoneyPanel.vue"
import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { money, qty, shortDate } from "../data/format"
import { useAsync } from "../data/useAsync"

const route = useRoute()
const router = useRouter()

const invoiceName = computed(() => String(route.params.name ?? ""))
const doc = useAsync(() => api.invoiceForPrint(invoiceName.value), [invoiceName])
const d = computed(() => doc.data.value)

const statusVariant = computed(() => {
	const s = (d.value?.status || "").toLowerCase()
	if (s.includes("paid") && !s.includes("unpaid")) return "green"
	if (s.includes("overdue")) return "red"
	if (s.includes("unpaid") || s.includes("partly")) return "orange"
	return "gray"
})

async function share() {
	if (!d.value) return
	const doc_ = d.value
	const lines = doc_.items
		.map((i) => `${i.item_name}  ${qty(i.qty)} x ${money(i.rate)}  ${money(i.amount)}`)
		.join("\n")

	const text =
		`${doc_.company.company_name}\n${doc_.name} · ${shortDate(doc_.posting_date, true)}\n` +
		`${doc_.customer_name}\n\n${lines}\n\n` +
		`Total ${doc_.currency} ${money(doc_.rounded_total)}\n` +
		`Outstanding ${money(doc_.outstanding_amount)}`

	// The share sheet is the point on a handset; the clipboard is the honest
	// fallback where the browser has no sheet to offer.
	if (navigator.share) {
		await navigator.share({ title: doc_.name, text }).catch(() => {})
		return
	}

	try {
		await navigator.clipboard.writeText(text)
		toast.success("Invoice copied")
	} catch {
		toast.error("Could not share this invoice")
	}
}
</script>
