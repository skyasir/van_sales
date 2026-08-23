<template>
	<!--
		Customer detail: the credit gate before any sell action.

		Limit, headroom and the oldest overdue invoice render above the buttons
		on purpose. The rep should learn the account is blocked before they
		start building an invoice they cannot close.
	-->
	<div>
		<PageHeader :title="c?.customer_name ?? customerId" :subtitle="headerSubtitle" back />

		<ScreenBody>
			<div v-if="snapshot.loading.value && !c" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-brand" />
			</div>

			<ErrorState
				v-else-if="snapshot.error.value"
				:message="snapshot.error.value"
				:offline="snapshot.offline.value"
				:on-retry="snapshot.reload"
			/>

			<template v-else-if="c">
				<Banner
					v-if="c.blocked"
					variant="danger"
					title="Account frozen"
					body="This customer is disabled or frozen in ERPNext. No new invoice can be raised against them."
				/>

				<div class="van-card p-3.5">
					<h2 class="text-[19px] font-semibold -tracking-[0.02em] text-van-text">
						{{ c.customer_name }}
					</h2>
					<p class="mt-1 text-[12.5px] text-van-muted">
						{{ c.name }}{{ c.tax_id ? ` · TRN ${c.tax_id}` : ""
						}}{{ c.payment_terms ? ` · ${c.payment_terms}` : "" }}
					</p>

					<div class="mt-3 flex gap-2.5">
						<div class="flex-1 rounded-xl bg-van-bg p-3">
							<p class="section-label">Outstanding</p>
							<p class="money mt-1 text-lg font-semibold text-van-text">
								{{ money(c.outstanding) }}
							</p>
						</div>
						<div class="flex-1 rounded-xl bg-van-bg p-3">
							<p class="section-label">Credit limit</p>
							<p class="money mt-1 text-lg font-semibold text-van-text">
								{{ c.credit_limit > 0 ? money(c.credit_limit, 0) : "None" }}
							</p>
						</div>
					</div>

					<div v-if="c.credit_limit > 0" class="mt-3">
						<AgeingBar
							:height="8"
							label="Credit used"
							:segments="[
								{ name: 'Used', value: usedPct, color: usedColor },
								{ name: 'Headroom', value: 100 - usedPct, color: '#EFF2F7' },
							]"
						/>
						<div class="mt-2 flex justify-between">
							<span
								class="text-xs font-semibold"
								:class="usedPct > 90 ? 'text-bad' : 'text-warn'"
							>
								{{ usedPct.toFixed(0) }}% used ·
								{{ money(c.credit_headroom ?? 0, 0) }} headroom
							</span>
							<span
								v-if="c.overdue_invoices > 0"
								class="text-xs font-semibold text-bad"
							>
								{{ c.overdue_invoices }} overdue
							</span>
						</div>
					</div>
				</div>

				<Button class="h-[54px]" variant="solid" theme="blue" @click="startInvoice"
					>New invoice</Button
				>

				<div class="flex gap-2.5">
					<Button class="h-touch flex-1" variant="outline" @click="collect">
						Collect payment
					</Button>
					<Button
						class="h-touch flex-1"
						variant="outline"
						@click="router.push({ name: 'statement', params: { id: customerId } })"
					>
						Statement
					</Button>
				</div>

				<Button
					class="h-touch !text-bad"
					variant="outline"
					@click="router.push({ name: 'credit-note', params: { invoice: 'new' } })"
				>
					Credit note
				</Button>

				<p class="section-label mt-1">Recent activity</p>

				<div
					v-if="statement.loading.value && !statement.data.value"
					class="py-6 text-center"
				>
					<LoadingIndicator class="mx-auto h-5 w-5 text-brand" />
				</div>

				<EmptyState
					v-else-if="!statement.data.value?.lines?.length"
					text="Nothing on this account in the last year."
				/>

				<template v-else>
					<component
						:is="line.doctype === 'Sales Invoice' ? 'button' : 'div'"
						v-for="line in statement.data.value.lines.slice(0, 6)"
						:key="`${line.doctype}-${line.name}`"
						:type="line.doctype === 'Sales Invoice' ? 'button' : undefined"
						class="van-card p-3 text-left"
						:class="line.doctype === 'Sales Invoice' ? 'active:bg-van-bg' : ''"
						@click="line.doctype === 'Sales Invoice' && openInvoice(line.name)"
					>
						<div class="flex gap-2">
							<div class="min-w-0 flex-1">
								<p class="money truncate text-[13px] font-semibold text-van-text">
									{{ line.name }}
								</p>
								<p class="mt-1 truncate text-[11.5px] text-van-faint">
									{{ shortDate(line.date, true)
									}}{{ line.mode_of_payment ? ` · ${line.mode_of_payment}` : "" }}
								</p>
							</div>
							<div class="shrink-0 text-right">
								<p
									class="money text-[14.5px] font-semibold"
									:class="line.amount < 0 ? 'text-ok' : 'text-van-text'"
								>
									{{ money(line.amount) }}
								</p>
								<p class="mt-0.5 text-[10.5px] font-bold text-van-faint">
									{{ line.state }}
								</p>
							</div>
						</div>

						<div
							v-if="line.partial"
							class="mt-2.5 flex justify-between border-t border-dashed border-van-subtle pt-2.5"
						>
							<span class="money text-[11.5px] font-medium text-ok">
								Paid {{ money(line.paid) }}
							</span>
							<span class="money text-[11.5px] font-medium text-[#B42318]">
								Balance {{ money(line.balance) }}
							</span>
						</div>
					</component>
				</template>
			</template>
		</ScreenBody>
	</div>
</template>

<script setup>
import { Button, LoadingIndicator } from "frappe-ui"
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import AgeingBar from "../components/AgeingBar.vue"
import Banner from "../components/Banner.vue"
import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { setCustomer } from "../data/cart"
import { money, shortDate } from "../data/format"
import { useAsync } from "../data/useAsync"

const route = useRoute()
const router = useRouter()

const customerId = computed(() => String(route.params.id ?? ""))

const snapshot = useAsync(() => api.customerSnapshot(customerId.value), [customerId])
const statement = useAsync(() => api.statement(customerId.value), [customerId])

const c = computed(() => snapshot.data.value)

const headerSubtitle = computed(() => {
	if (!c.value) return ""
	return `${c.value.name}${c.value.territory ? ` · ${c.value.territory}` : ""}`
})

const usedPct = computed(() => {
	if (!c.value || c.value.credit_limit <= 0) return 0
	return Math.min(100, (c.value.outstanding / c.value.credit_limit) * 100)
})

const usedColor = computed(() => {
	if (usedPct.value > 90) return "#D92D20"
	if (usedPct.value > 75) return "#DC6803"
	return "#0E9F6E"
})

function startInvoice() {
	if (!c.value) return
	setCustomer(c.value)
	// The basket screen, not the scanner. Scanning is the fast path, not the
	// only one -- sending the rep straight to a camera they may not be able to
	// use would make a secondary tool block the sale.
	router.push({ name: "invoice" })
}

function collect() {
	if (!c.value) return
	setCustomer(c.value)
	router.push({ name: "payment", query: { mode: "collect" } })
}

function openInvoice(name) {
	router.push({ name: "invoice-view", params: { name } })
}
</script>
