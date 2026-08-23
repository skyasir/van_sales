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
			<div class="van-card p-3.5">
				<LinkField
					label="Customer"
					placeholder="Search and open a customer"
					@open="picking = true"
				/>
			</div>

			<!-- Six statuses do not fit across a phone, so the row scrolls
			     rather than squeezing each one into an unreadable stub. -->
			<div class="-mx-3.5 overflow-x-auto px-3.5">
				<div class="flex w-max gap-[7px]">
					<button
						v-for="option in SCOPES"
						:key="option.key"
						type="button"
						role="tab"
						:aria-selected="scope === option.key"
						class="flex h-[38px] items-center justify-center rounded-full border px-4 text-[13px] font-bold"
						:class="
							scope === option.key
								? 'border-van-text bg-van-text text-white'
								: 'border-van-border bg-van-card text-[#3B4658]'
						"
						@click="scope = option.key"
					>
						{{ option.label }}
					</button>
				</div>
			</div>

			<div v-if="list.loading.value && !list.data.value" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-brand" />
			</div>

			<ErrorState
				v-else-if="list.error.value"
				:message="list.error.value"
				:offline="list.offline.value"
				:on-retry="list.reload"
			/>

			<EmptyState v-else-if="!list.data.value?.customers?.length" :text="emptyText" />

			<template v-else>
				<p class="section-label">
					{{ list.data.value.total }} customer{{ list.data.value.total === 1 ? "" : "s" }}
				</p>

				<button
					v-for="customer in list.data.value.customers"
					:key="customer.name"
					type="button"
					class="van-card p-3.5 text-left active:bg-van-bg"
					@click="open(customer.name)"
				>
					<div class="flex gap-3">
						<div class="min-w-0 flex-1">
							<p class="truncate text-[14.5px] font-semibold text-van-text">
								{{ customer.customer_name }}
							</p>
							<p class="money mt-1 truncate text-[11.5px] font-medium text-van-faint">
								{{ customer.name
								}}{{ customer.payment_terms ? ` · ${customer.payment_terms}` : "" }}
							</p>
						</div>
						<div class="shrink-0 text-right">
							<p class="money text-base font-semibold" :class="dueTone(customer)">
								{{ money(customer.outstanding) }}
							</p>
							<p class="mt-0.5 text-[10.5px] text-van-faint">due</p>
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
							:class="customer.overdue > 0 ? 'text-[#B42318]' : 'text-van-faint'"
						>
							{{
								customer.overdue > 0
									? `${customer.overdue_invoices} overdue`
									: "Current"
							}}
						</span>
					</div>

					<p v-if="customer.credit_limit > 0" class="mt-2 text-[11px] text-van-faint">
						Limit {{ money(customer.credit_limit, 0) }} · headroom
						{{ money(customer.credit_headroom ?? 0, 0) }}
					</p>
				</button>
			</template>
		</ScreenBody>

		<PickerSheet
			:open="picking"
			title="Select customer"
			placeholder="Name, code or TRN"
			empty-text="No customer matches that search."
			:fetch="searchCustomers"
			:key-for="(c) => c.name"
			@close="picking = false"
			@select="onPick"
		>
			<template #row="{ row }">
				<div class="flex gap-3">
					<div class="min-w-0 flex-1">
						<p class="truncate text-[14.5px] font-semibold text-van-text">
							{{ row.customer_name }}
						</p>
						<p class="money mt-0.5 truncate text-[11.5px] font-medium text-van-faint">
							{{ row.name }}{{ row.payment_terms ? ` · ${row.payment_terms}` : "" }}
						</p>
					</div>
					<div class="shrink-0 text-right">
						<p
							class="money text-sm font-semibold"
							:class="row.overdue > 0 ? 'text-bad' : 'text-van-text'"
						>
							{{ money(row.outstanding) }}
						</p>
						<p class="mt-0.5 text-[10.5px] text-van-faint">due</p>
					</div>
				</div>
			</template>
		</PickerSheet>
	</div>
</template>

<script setup>
import { LoadingIndicator } from "frappe-ui"
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import AgeingBar from "../components/AgeingBar.vue"
import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import LinkField from "../components/LinkField.vue"
import PageHeader from "../components/PageHeader.vue"
import PickerSheet from "../components/PickerSheet.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { money } from "../data/format"
import { useAsync } from "../data/useAsync"

const route = useRoute()
const router = useRouter()

/** Mirrors ERPNext's Sales Invoice status vocabulary. */
const SCOPES = [
	{ key: "all", label: "All" },
	{ key: "paid", label: "Paid" },
	{ key: "unpaid", label: "Unpaid" },
	{ key: "overdue", label: "Overdue" },
	{ key: "credit_note", label: "Credit Note" },
	{ key: "return", label: "Return" },
]

const scope = ref("all")
const picking = ref(false)

// The route screen links here with a scope already in mind.
watch(
	() => route.query.scope,
	(wanted) => {
		if (SCOPES.some((x) => x.key === wanted)) scope.value = wanted
	},
	{ immediate: true },
)

const list = useAsync(() => api.listCustomers({ scope: scope.value, limit: 100 }), [scope])

const emptyText = computed(() =>
	scope.value === "all"
		? "No customers found."
		: `No customer has an invoice marked ${SCOPES.find((x) => x.key === scope.value)?.label}.`,
)

function dueTone(customer) {
	if (customer.outstanding <= 0) return "text-ok"
	return customer.overdue > 0 ? "text-[#B42318]" : "text-van-text"
}

async function searchCustomers(query) {
	const result = await api.listCustomers({ search: query || undefined, limit: 40 })
	return result.customers
}

function open(name) {
	router.push({ name: "customer", params: { id: name } })
}

function onPick(customer) {
	picking.value = false
	open(customer.name)
}
</script>
