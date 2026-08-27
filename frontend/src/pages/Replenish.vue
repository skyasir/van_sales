<template>
	<!-- What is physically on the van right now, valued at cost. -->
	<div>
		<PageHeader title="Van stock" :subtitle="session.van?.warehouse_name ?? 'No van assigned'">
			<template #right>
				<button
					type="button"
					class="flex h-9 w-9 items-center justify-center rounded-full active:bg-surface-gray-2"
					aria-label="Refresh"
					@click="stock.reload"
				>
					<FeatherIcon
						name="refresh-cw"
						class="h-[18px] w-[18px] text-ink-gray-6"
						:class="{ 'animate-spin': stock.loading.value }"
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
				description="Without a Van Sales Profile there is no warehouse to report stock from."
			/>

			<template v-else>
				<MoneyPanel>
					<div class="flex items-center gap-3">
						<div class="min-w-0 flex-1">
							<p
								class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-gray-5"
							>
								Stock value on van
							</p>
							<p class="money mt-1 text-2xl font-semibold text-ink-gray-9">
								{{ compact(stock.data.value?.total_value ?? 0) }}
							</p>
						</div>
						<div class="text-right">
							<p class="money text-xl font-semibold text-ink-gray-9">
								{{ rows.length }}
							</p>
							<p class="mt-0.5 text-[11px] text-ink-gray-5">items</p>
						</div>
					</div>
				</MoneyPanel>

				<input
					v-model="search"
					type="search"
					placeholder="Filter items"
					class="h-[46px] rounded-xl border border-outline-gray-2 bg-surface-white px-3.5 text-[14.5px] text-ink-gray-8 placeholder:text-ink-gray-4 focus:border-outline-blue-1 focus:outline-none"
				/>

				<div v-if="stock.loading.value && !stock.data.value" class="py-6 text-center">
					<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
				</div>

				<ErrorState
					v-else-if="stock.error.value"
					:message="stock.error.value"
					:offline="stock.offline.value"
					:on-retry="stock.reload"
				/>

				<EmptyState v-else-if="!rows.length" :text="emptyText" />

				<template v-else>
					<div
						v-for="row in rows"
						:key="row.item_code"
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex items-center gap-3 p-3"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-[14.5px] font-semibold text-ink-gray-8">
								{{ row.item_name }}
							</p>
							<p
								class="money mt-0.5 truncate text-[11.5px] font-medium text-ink-gray-5"
							>
								{{ row.item_code }}
							</p>
						</div>
						<div class="shrink-0 text-right">
							<!-- A negative on the van is a real position, not a display
							     bug, so it is coloured rather than hidden. -->
							<p
								class="money text-base font-semibold"
								:class="row.qty <= 0 ? 'text-ink-red-3' : 'text-ink-gray-8'"
							>
								{{ qty(row.qty) }}
							</p>
							<p class="mt-0.5 text-[11px] text-ink-gray-5">{{ row.uom }}</p>
						</div>
					</div>
				</template>
			</template>
		</ScreenBody>
	</div>
</template>

<script setup>
import { Alert, FeatherIcon, LoadingIndicator } from "frappe-ui"
import { computed, ref } from "vue"

import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import MoneyPanel from "../components/MoneyPanel.vue"
import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { compact, qty } from "../data/format"
import { session } from "../data/session"
import { useAsync } from "../data/useAsync"

const search = ref("")
const warehouse = computed(() => session.van?.warehouse ?? "")

const stock = useAsync(
	() => (warehouse.value ? api.vanStock(warehouse.value) : Promise.resolve(null)),
	[warehouse],
)

const rows = computed(() => {
	const items = stock.data.value?.items ?? []
	const text = search.value.trim().toLowerCase()
	if (!text) return items
	return items.filter((row) => `${row.item_name} ${row.item_code}`.toLowerCase().includes(text))
})

// Telling "the van is empty" apart from "your filter matched nothing" saves a
// rep hunting for stock that is actually there.
const emptyText = computed(() =>
	search.value.trim() ? "No item matches that filter." : "Nothing on this van.",
)
</script>
