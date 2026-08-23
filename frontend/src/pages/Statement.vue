<template>
	<!--
		Statement of account.

		Invoice-level rather than a single balance: each invoice shows what was
		paid against it and what remains, so a part-payment or a credit note is
		visible instead of being netted into one number the customer disputes.
	-->
	<div>
		<PageHeader title="Statement" :subtitle="customerId" back />

		<ScreenBody>
			<div v-if="statement.loading.value && !statement.data.value" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-brand" />
			</div>

			<ErrorState
				v-else-if="statement.error.value"
				:message="statement.error.value"
				:offline="statement.offline.value"
				:on-retry="statement.reload"
			/>

			<template v-else-if="statement.data.value">
				<div class="van-card p-3.5">
					<div class="flex gap-2.5">
						<TotalTile
							label="Billed"
							:value="money(d.billed)"
							class="bg-van-bg text-van-text"
						/>
						<TotalTile
							label="Paid"
							:value="money(d.paid)"
							class="bg-ok-wash text-[#067647]"
						/>
						<TotalTile
							label="Due"
							:value="money(d.outstanding)"
							class="bg-bad-wash text-[#B42318]"
						/>
					</div>
				</div>

				<p class="section-label">Last 12 months</p>

				<EmptyState v-if="!d.lines.length" text="No activity on this account." />

				<template v-else>
					<component
						:is="line.doctype === 'Sales Invoice' ? 'button' : 'div'"
						v-for="line in d.lines"
						:key="`${line.doctype}-${line.name}`"
						:type="line.doctype === 'Sales Invoice' ? 'button' : undefined"
						class="van-card border-l-[3px] p-3 text-left"
						:class="[
							stateBorder(line.state),
							line.doctype === 'Sales Invoice' ? 'active:bg-van-bg' : '',
						]"
						@click="line.doctype === 'Sales Invoice' && openInvoice(line.name)"
					>
						<div class="flex gap-2.5">
							<div class="min-w-0 flex-1">
								<p class="money truncate text-[13px] font-semibold text-van-text">
									{{ line.name }}
								</p>
								<p class="mt-1 truncate text-[11.5px] text-van-faint">
									{{ shortDate(line.date, true)
									}}{{ line.due_date ? ` · due ${shortDate(line.due_date)}` : ""
									}}{{ line.reference_no ? ` · ${line.reference_no}` : "" }}
								</p>
							</div>
							<div class="shrink-0 text-right">
								<p
									class="money text-[15px] font-semibold"
									:class="line.amount < 0 ? 'text-[#067647]' : 'text-van-text'"
								>
									{{ money(line.amount) }}
								</p>
								<p
									class="mt-0.5 text-[10.5px] font-bold"
									:class="stateText(line.state)"
								>
									{{ line.state }}
								</p>
							</div>
						</div>

						<div
							v-if="line.partial"
							class="mt-2.5 flex justify-between border-t border-van-subtle pt-2.5"
						>
							<span class="money text-[11.5px] font-medium text-[#067647]">
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
import { LoadingIndicator } from "frappe-ui"
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"
import TotalTile from "../components/TotalTile.vue"
import { api } from "../data/api"
import { money, shortDate } from "../data/format"
import { useAsync } from "../data/useAsync"

const route = useRoute()
const router = useRouter()

const customerId = computed(() => String(route.params.id ?? ""))
const statement = useAsync(() => api.statement(customerId.value), [customerId])
const d = computed(() => statement.data.value)

const STATE_BORDER = {
	OVERDUE: "border-l-bad",
	PARTIAL: "border-l-warn",
	RECEIPT: "border-l-ok",
	"DRAFT RECEIPT": "border-l-brand",
	CREDIT: "border-l-ok",
	PAID: "border-l-ok",
}

const STATE_TEXT = {
	OVERDUE: "text-bad",
	PARTIAL: "text-warn",
	RECEIPT: "text-ok",
	"DRAFT RECEIPT": "text-brand",
	CREDIT: "text-ok",
	PAID: "text-ok",
}

function stateBorder(state) {
	return STATE_BORDER[state] ?? "border-l-van-placeholder"
}

function stateText(state) {
	return STATE_TEXT[state] ?? "text-van-placeholder"
}

// Only invoices have a screen to open; a payment entry row stays flat rather
// than pretending to be tappable.
function openInvoice(name) {
	router.push({ name: "invoice-view", params: { name } })
}
</script>
