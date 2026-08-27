<template>
	<!--
		The van rep's home.

		Cash on hand leads because it is the number the rep is accountable for
		at day close, and it is derived from the Payment Entries themselves
		rather than a running total the app keeps -- so it always matches what
		the cashier will count.
	-->
	<div>
		<PageHeader title="Van Sales" :subtitle="headerSubtitle">
			<template #right>
				<button
					type="button"
					class="flex h-9 w-9 items-center justify-center rounded-full active:bg-surface-gray-2"
					aria-label="Refresh"
					@click="reloadAll"
				>
					<FeatherIcon
						name="refresh-cw"
						class="h-[18px] w-[18px] text-ink-gray-6"
						:class="{ 'animate-spin': busy }"
					/>
				</button>
			</template>
		</PageHeader>

		<ScreenBody>
			<Alert
				v-if="!session.van"
				theme="yellow"
				title="No van assigned"
				:dismissable="false"
				description="Your user is not on a Van Sales Profile yet, so there is no warehouse to sell from. Ask your administrator to add you to one."
			/>

			<MoneyPanel>
				<div class="flex items-center gap-3">
					<div class="min-w-0 flex-1">
						<p
							class="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-ink-gray-5"
						>
							{{ session.van ? session.van.warehouse_name : "No van" }}
						</p>
						<p
							class="mt-1 text-[22px] font-semibold -tracking-[0.02em] text-ink-gray-9"
						>
							Cash on hand
						</p>
					</div>
					<div class="text-right">
						<p class="money text-[26px] font-semibold text-ink-gray-9">
							{{ money(collections.data.value?.cash_on_hand ?? 0, 0) }}
						</p>
						<p class="mt-0.5 text-[11.5px] text-ink-gray-5">
							{{ currency }} ·
							{{ collections.data.value?.entries?.length ?? 0 }} receipts
						</p>
					</div>
				</div>

				<div class="mt-3.5 flex gap-2.5">
					<StatTile
						label="Van stock"
						:value="compact(stock.data.value?.total_value ?? 0)"
					/>
					<StatTile
						label="Collected"
						:value="compact(collections.data.value?.total_collected ?? 0)"
					/>
					<StatTile
						label="Drafts"
						:value="String(collections.data.value?.draft_count ?? 0)"
					/>
				</div>
			</MoneyPanel>

			<!-- Receivables belong here, not two taps away on the customer list:
			     what the round is owed is something the rep should meet before
			     they set off, not go looking for. -->
			<div
				v-if="receivables.data.value"
				class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
			>
				<div class="flex items-start justify-between gap-2.5">
					<div class="min-w-0 flex-1">
						<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
							Total receivable
						</p>
						<p
							class="money mt-1 text-[26px] font-semibold -tracking-[0.03em] text-ink-gray-8"
						>
							{{ money(receivables.data.value.outstanding) }}
						</p>
						<p class="mt-0.5 text-xs text-ink-gray-6">
							{{ receivables.data.value.customers_with_balance }} customer{{
								receivables.data.value.customers_with_balance === 1 ? "" : "s"
							}}
							with a balance
						</p>
					</div>

					<button
						v-if="receivables.data.value.overdue > 0"
						type="button"
						class="shrink-0 rounded-full border border-outline-red-2 bg-surface-red-2 px-2.5 py-1.5 text-[11.5px] font-bold text-ink-red-4"
						@click="router.push({ name: 'customers', query: { scope: 'overdue' } })"
					>
						{{ money(receivables.data.value.overdue, 0) }} overdue
					</button>
				</div>

				<div v-if="receivables.data.value.outstanding > 0" class="mt-3">
					<AgeingBar :segments="ageingSegments" :height="6" />
					<div class="mt-2 flex flex-wrap gap-3">
						<div
							v-for="segment in ageingSegments.filter((s) => s.value > 0)"
							:key="segment.name"
							class="flex items-center gap-1.5"
						>
							<span
								class="h-[7px] w-[7px] rounded-full"
								:style="{ backgroundColor: segment.color }"
							/>
							<span class="text-[11.5px] text-ink-gray-5">{{ segment.name }}</span>
							<span class="money text-[11.5px] font-semibold text-ink-gray-6">
								{{ money(segment.value, 0) }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- The two things a rep does at a stop. Stock has its own tab, so a
			     third button here would only compete with these. -->
			<div class="flex gap-2.5">
				<Button
					class="h-touch flex-1"
					variant="solid"
					theme="blue"
					@click="router.push({ name: 'invoice' })"
				>
					New invoice
				</Button>
				<Button
					class="h-touch flex-1 !text-ink-red-3"
					variant="outline"
					@click="router.push({ name: 'credit-note', params: { invoice: 'new' } })"
				>
					Credit note
				</Button>
			</div>

			<div class="flex items-center justify-between">
				<span class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5"
					>Customers with a balance</span
				>
				<button
					type="button"
					class="text-[12.5px] font-semibold text-ink-blue-2"
					@click="router.push({ name: 'customers' })"
				>
					See all
				</button>
			</div>

			<div v-if="customers.loading.value && !customers.data.value" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
			</div>

			<ErrorState
				v-else-if="customers.error.value"
				:message="customers.error.value"
				:offline="customers.offline.value"
				:on-retry="customers.reload"
			/>

			<EmptyState
				v-else-if="!customers.data.value?.customers?.length"
				text="No customer has an open balance."
			/>

			<template v-else>
				<button
					v-for="customer in customers.data.value.customers"
					:key="customer.name"
					type="button"
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex items-center gap-3 p-3.5 text-left active:bg-surface-gray-1"
					@click="router.push({ name: 'customer', params: { id: customer.name } })"
				>
					<div class="min-w-0 flex-1">
						<p class="truncate text-[15px] font-semibold text-ink-gray-8">
							{{ customer.customer_name }}
						</p>
						<p class="mt-0.5 truncate text-xs text-ink-gray-6">
							{{ customer.name
							}}{{ customer.payment_terms ? ` · ${customer.payment_terms}` : "" }}
						</p>
					</div>
					<div class="shrink-0 text-right">
						<p
							class="money text-[15px] font-semibold"
							:class="customer.overdue > 0 ? 'text-ink-red-3' : 'text-ink-gray-8'"
						>
							{{ money(customer.outstanding) }}
						</p>
						<p
							class="mt-0.5 text-[11px] font-bold"
							:class="customer.overdue > 0 ? 'text-ink-red-3' : 'text-ink-gray-5'"
						>
							{{
								customer.overdue > 0
									? `${customer.overdue_invoices} overdue`
									: `${customer.open_invoices} open`
							}}
						</p>
					</div>
				</button>
			</template>
		</ScreenBody>
	</div>
</template>

<script setup>
import { Alert, Button, FeatherIcon, LoadingIndicator } from "frappe-ui"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

import AgeingBar from "../components/AgeingBar.vue"
import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import MoneyPanel from "../components/MoneyPanel.vue"
import PageHeader from "../components/PageHeader.vue"
import StatTile from "../components/StatTile.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { compact, money } from "../data/format"
import { requestLocationAccess } from "../data/geo"
import { currency, policy, refresh, session } from "../data/session"
import { useAsync } from "../data/useAsync"

const router = useRouter()

const vanKey = computed(() => session.van?.profile ?? "")
const warehouse = computed(() => session.van?.warehouse ?? "")

const collections = useAsync(() => api.myCollections(), [vanKey])
const stock = useAsync(
	() => (warehouse.value ? api.vanStock(warehouse.value) : Promise.resolve(null)),
	[warehouse],
)
const customers = useAsync(() => api.listCustomers({ scope: "unpaid", limit: 6 }), [vanKey])
const receivables = useAsync(() => api.receivablesSummary(), [vanKey])

const busy = ref(false)

const headerSubtitle = computed(() => {
	const name = session.bootstrap?.user?.full_name ?? ""
	if (!session.van) return name
	return `${name} · ${session.van.vehicle ?? session.van.warehouse_name}`
})

const BUCKET_COLOR = {
	current: "#17B26A",
	"1-30": "#84CAFF",
	"31-60": "#FDB022",
	"60+": "#F97066",
}

const ageingSegments = computed(() =>
	Object.entries(BUCKET_COLOR).map(([bucket, color]) => ({
		name: bucket === "current" ? "Current" : `${bucket} days`,
		value: receivables.data.value?.ageing?.[bucket] ?? 0,
		color,
	})),
)

async function reloadAll() {
	busy.value = true
	// Refreshing also re-reads policy and roles, so a setting changed on the
	// desk can be pulled in deliberately rather than waited for.
	await Promise.allSettled([
		collections.reload(),
		stock.reload(),
		customers.reload(),
		receivables.reload(),
		refresh(),
	])
	busy.value = false
}

// Ask for location here, on the screen the rep opens at the start of the day,
// so the browser prompt never lands in the middle of a sale. Its outcome
// gates nothing: refusing simply means documents post without coordinates.
onMounted(() => {
	if (policy.value.capture_gps) requestLocationAccess()
})
</script>
