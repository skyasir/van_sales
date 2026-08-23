<template>
	<!--
		Customers.

		Two ways in, because reps arrive here with two different intentions. If
		they know who they want, the Customer field opens a searchable picker
		and goes straight there -- the same move as a Link field on the desk.
		If they are working through the round, the list below filters by
		ERPNext's own invoice statuses, so "Overdue" here means exactly what it
		means on the desk rather than something this app decided for itself.

		The total receivable used to sit at the top of this screen. It lives on
		the route screen now: what the round is owed is something to meet on
		opening the app, not to go looking for.
	-->
	<div>
		<PageHeader title="Customers" subtitle="Receivables · live from ERPNext" />

		<ScreenBody>
			<div class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5">
				<LinkAutocomplete
					label="Customer"
					placeholder="Search and open a customer"
					:fetch="searchCustomerOptions"
					@update:model-value="onPick"
				/>
			</div>

			<!-- Six statuses do not fit across a phone, so the row scrolls
			     rather than squeezing each one into an unreadable stub. -->
			<div class="-mx-4 overflow-x-auto px-4">
				<TabButtons v-model="scope" class="w-max" :buttons="SCOPES" />
			</div>

			<div v-if="list.loading.value && !list.data.value" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
			</div>

			<ErrorState
				v-else-if="list.error.value"
				:message="list.error.value"
				:offline="list.offline.value"
				:on-retry="list.reload"
			/>

			<EmptyState v-else-if="!list.data.value?.customers?.length" :text="emptyText" />

			<template v-else>
				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
					{{ list.data.value.total }} customer{{ list.data.value.total === 1 ? "" : "s" }}
				</p>

				<button
					v-for="customer in list.data.value.customers"
					:key="customer.name"
					type="button"
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5 text-left active:bg-surface-gray-1"
					@click="open(customer.name)"
				>
					<div class="flex gap-3">
						<div class="min-w-0 flex-1">
							<p class="truncate text-[14.5px] font-semibold text-ink-gray-8">
								{{ customer.customer_name }}
							</p>
							<p
								class="money mt-1 truncate text-[11.5px] font-medium text-ink-gray-5"
							>
								{{ customer.name
								}}{{ customer.payment_terms ? ` · ${customer.payment_terms}` : "" }}
							</p>
						</div>
						<div class="shrink-0 text-right">
							<p class="money text-base font-semibold" :class="dueTone(customer)">
								{{ money(customer.outstanding) }}
							</p>
							<p class="mt-0.5 text-[10.5px] text-ink-gray-5">due</p>
						</div>
					</div>

					<div v-if="customer.outstanding > 0" class="mt-3 flex items-center gap-2">
						<div class="flex-1">
							<AgeingBar
								:height="6"
								label="Balance"
								:segments="[
									{
										name: 'Current',
										value: Math.max(0, customer.outstanding - customer.overdue),
										color: '#0E9F6E',
									},
									{ name: 'Overdue', value: customer.overdue, color: '#F97066' },
								]"
							/>
						</div>
						<span
							class="text-[11px] font-bold"
							:class="customer.overdue > 0 ? 'text-ink-red-4' : 'text-ink-gray-5'"
						>
							{{
								customer.overdue > 0
									? `${customer.overdue_invoices} overdue`
									: "Current"
							}}
						</span>
					</div>

					<p v-if="customer.credit_limit > 0" class="mt-2 text-[11px] text-ink-gray-5">
						Limit {{ money(customer.credit_limit, 0) }} · headroom
						{{ money(customer.credit_headroom ?? 0, 0) }}
					</p>
				</button>
			</template>
		</ScreenBody>
	</div>
</template>

<script setup>
import { LoadingIndicator, TabButtons } from "frappe-ui"
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import AgeingBar from "../components/AgeingBar.vue"
import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import LinkAutocomplete from "../components/LinkAutocomplete.vue"
import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { money } from "../data/format"
import { useAsync } from "../data/useAsync"

const route = useRoute()
const router = useRouter()

/** Mirrors ERPNext's Sales Invoice status vocabulary. */
const SCOPES = [
	{ label: "All", value: "all" },
	{ label: "Paid", value: "paid" },
	{ label: "Unpaid", value: "unpaid" },
	{ label: "Overdue", value: "overdue" },
	{ label: "Credit Note", value: "credit_note" },
	{ label: "Return", value: "return" },
]

const scope = ref("all")

// The route screen links here with a scope already in mind.
watch(
	() => route.query.scope,
	(wanted) => {
		if (SCOPES.some((x) => x.value === wanted)) scope.value = wanted
	},
	{ immediate: true },
)

const list = useAsync(() => api.listCustomers({ scope: scope.value, limit: 100 }), [scope])

const emptyText = computed(() =>
	scope.value === "all"
		? "No customers found."
		: `No customer has an invoice marked ${SCOPES.find((x) => x.value === scope.value)?.label}.`,
)

function dueTone(customer) {
	if (customer.outstanding <= 0) return "text-ink-green-3"
	return customer.overdue > 0 ? "text-ink-red-4" : "text-ink-gray-8"
}

/** Autocomplete wants {label, value}; the rest of the row rides along. */
async function searchCustomerOptions(query) {
	const result = await api.listCustomers({ search: query || undefined, limit: 40 })
	return result.customers.map((c) => ({ ...c, label: c.customer_name, value: c.name }))
}

function open(name) {
	router.push({ name: "customer", params: { id: name } })
}

function onPick(option) {
	if (option?.value) open(option.value)
}
</script>
