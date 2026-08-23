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
				<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
			</div>

			<ErrorState
				v-else-if="statement.error.value"
				:message="statement.error.value"
				:offline="statement.offline.value"
				:on-retry="statement.reload"
			/>

			<template v-else-if="statement.data.value">
				<div
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
				>
					<div class="flex gap-2.5">
						<StatTile label="Billed" :value="money(d.billed)" tone="gray" />
						<StatTile label="Paid" :value="money(d.paid)" tone="green" />
						<StatTile label="Due" :value="money(d.outstanding)" tone="red" />
					</div>
				</div>

				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
					Last 12 months
				</p>

				<EmptyState v-if="!d.lines.length" text="No activity on this account." />

				<template v-else>
					<component
						:is="line.doctype === 'Sales Invoice' ? 'button' : 'div'"
						v-for="line in d.lines"
						:key="`${line.doctype}-${line.name}`"
						:type="line.doctype === 'Sales Invoice' ? 'button' : undefined"
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm border-l-[3px] p-3 text-left"
						:class="[
							stateBorder(line.state),
							line.doctype === 'Sales Invoice' ? 'active:bg-surface-gray-1' : '',
						]"
						@click="line.doctype === 'Sales Invoice' && openInvoice(line.name)"
					>
						<div class="flex gap-2.5">
							<div class="min-w-0 flex-1">
								<p class="money truncate text-[13px] font-semibold text-ink-gray-8">
									{{ line.name }}
								</p>
								<p class="mt-1 truncate text-[11.5px] text-ink-gray-5">
									{{ shortDate(line.date, true)
									}}{{ line.due_date ? ` · due ${shortDate(line.due_date)}` : ""
									}}{{ line.reference_no ? ` · ${line.reference_no}` : "" }}
								</p>
							</div>
							<div class="shrink-0 text-right">
								<p
									class="money text-[15px] font-semibold"
									:class="
										line.amount < 0 ? 'text-ink-green-3' : 'text-ink-gray-8'
									"
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
							class="mt-2.5 flex justify-between border-t border-outline-gray-1 pt-2.5"
						>
							<span class="money text-[11.5px] font-medium text-ink-green-3">
								Paid {{ money(line.paid) }}
							</span>
							<span class="money text-[11.5px] font-medium text-ink-red-4">
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
import StatTile from "../components/StatTile.vue"
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
	"DRAFT RECEIPT": "border-l-outline-blue-1",
	CREDIT: "border-l-ok",
	PAID: "border-l-ok",
}

const STATE_TEXT = {
	OVERDUE: "text-ink-red-3",
	PARTIAL: "text-ink-amber-3",
	RECEIPT: "text-ink-green-3",
	"DRAFT RECEIPT": "text-ink-blue-2",
	CREDIT: "text-ink-green-3",
	PAID: "text-ink-green-3",
}

function stateBorder(state) {
	return STATE_BORDER[state] ?? "border-l-outline-gray-3"
}

function stateText(state) {
	return STATE_TEXT[state] ?? "text-ink-gray-4"
}

// Only invoices have a screen to open; a payment entry row stays flat rather
// than pretending to be tappable.
function openInvoice(name) {
	router.push({ name: "invoice-view", params: { name } })
}
</script>
