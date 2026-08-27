<template>
	<!--
		Item search -- the path to a line when scanning is off or a barcode
		will not read.

		Deliberately the secondary way in, but it has to exist: a torn label or
		a site with scanning disabled must not leave the rep unable to sell. It
		is priced by the same endpoint the scanner uses, so a line added here
		is identical to a scanned one.
	-->
	<div class="flex min-h-full flex-col">
		<PageHeader
			title="Add item"
			:subtitle="cart.customer?.customer_name ?? session.van?.warehouse_name ?? ''"
			back
		/>

		<div class="flex-1">
			<ScreenBody>
				<Alert
					v-if="!allowed"
					theme="yellow"
					title="Manual search is turned off"
					:dismissable="false"
					description="This site requires items to be scanned. Ask your administrator if a barcode will not read."
				/>

				<template v-else>
					<div
						class="flex h-12 items-center gap-2.5 rounded-xl border border-outline-gray-2 bg-surface-white px-3.5 focus-within:border-outline-blue-1"
					>
						<FeatherIcon name="search" class="h-4 w-4 shrink-0 text-ink-gray-4" />
						<input
							v-model="query"
							type="search"
							placeholder="Item name or code"
							autocapitalize="none"
							class="min-w-0 flex-1 bg-transparent text-[15px] text-ink-gray-8 placeholder:text-ink-gray-4 focus:outline-none"
							@keyup.enter="applied = query.trim()"
						/>
						<button
							v-if="query"
							type="button"
							aria-label="Clear search"
							@click="clearSearch"
						>
							<FeatherIcon
								name="x-circle"
								class="h-[18px] w-[18px] text-ink-gray-4"
							/>
						</button>
					</div>

					<div v-if="items.loading.value && !items.data.value" class="py-6 text-center">
						<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
					</div>

					<ErrorState
						v-else-if="items.error.value"
						:message="items.error.value"
						:offline="items.offline.value"
						:on-retry="items.reload"
					/>

					<EmptyState v-else-if="!items.data.value?.items?.length" :text="emptyText" />

					<template v-else>
						<button
							v-for="item in items.data.value.items"
							:key="item.item_code"
							type="button"
							class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex items-center gap-3 p-3.5 text-left transition-colors"
							:class="
								added === item.item_code
									? '!border-outline-green-2 bg-surface-green-2'
									: 'active:bg-surface-gray-1'
							"
							@click="add(item)"
						>
							<div class="min-w-0 flex-1">
								<p
									class="line-clamp-2 text-[14.5px] font-semibold leading-[19px] text-ink-gray-8"
								>
									{{ item.item_name }}
								</p>
								<p
									class="money mt-1 truncate text-[11.5px] font-medium text-ink-gray-5"
								>
									{{ item.item_code }} · {{ item.uom }}
								</p>

								<!-- What is on the van, not what the warehouse holds. A rep
								     cannot sell stock that is not in the vehicle. -->
								<span
									class="mt-1.5 inline-flex items-center gap-1.5 rounded-[9px] px-2 py-1"
									:class="
										item.van_qty > 0 ? 'bg-surface-green-2' : 'bg-surface-red-2'
									"
								>
									<span
										class="h-1.5 w-1.5 rounded-full"
										:class="
											item.van_qty > 0
												? 'bg-surface-green-2'
												: 'bg-surface-red-2'
										"
									/>
									<span
										class="text-[11.5px] font-bold"
										:class="
											item.van_qty > 0 ? 'text-ink-green-3' : 'text-ink-red-4'
										"
									>
										{{
											item.van_qty > 0
												? `Available in van: ${qty(item.van_qty)} ${item.uom}`
												: "Out of stock"
										}}
									</span>
								</span>
							</div>

							<div class="flex shrink-0 flex-col items-end gap-1.5">
								<p class="money text-base font-semibold text-ink-gray-8">
									{{ money(item.rate) }}
								</p>
								<Button
									size="md"
									:variant="added === item.item_code ? 'solid' : 'subtle'"
									:theme="added === item.item_code ? 'green' : 'gray'"
									:icon="added === item.item_code ? 'check' : 'plus'"
									:aria-label="`Add ${item.item_name}`"
								/>
								<span
									v-if="inCart(item.item_code)"
									class="text-[10.5px] font-semibold text-ink-gray-6"
								>
									{{ qty(inCart(item.item_code).qty) }} in cart
								</span>
							</div>
						</button>
					</template>
				</template>
			</ScreenBody>
		</div>

		<div
			v-if="cart.lines.length"
			class="sticky bottom-0 border-t border-outline-gray-2 bg-surface-white p-3"
		>
			<Button
				class="w-full"
				size="xl"
				variant="solid"
				theme="blue"
				@click="router.push({ name: 'invoice' })"
			>
				<span class="flex w-full items-center justify-between">
					<span
						>Done · {{ cart.lines.length }}
						{{ cart.lines.length === 1 ? "line" : "lines" }}</span
					>
					<span class="money">{{ money(subtotal) }}</span>
				</span>
			</Button>
		</div>
	</div>
</template>

<script setup>
import { Alert, Button, FeatherIcon, LoadingIndicator } from "frappe-ui"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { addItem, cart, subtotal } from "../data/cart"
import { money, qty } from "../data/format"
import { policy, session } from "../data/session"
import { useAsync } from "../data/useAsync"

const router = useRouter()

const query = ref("")
const applied = ref("")
const added = ref(null)

const allowed = computed(() => policy.value.manual_item_search ?? true)
const customerKey = computed(() => cart.customer?.name ?? "")
const warehouse = computed(() => session.van?.warehouse ?? "")

const items = useAsync(
	() =>
		allowed.value
			? api.searchItems({
					query: applied.value || undefined,
					warehouse: session.van?.warehouse,
					customer: cart.customer?.name,
					price_list: session.van?.price_list,
					company: session.van?.company,
					currency: session.van?.currency,
					limit: 50,
				})
			: Promise.resolve({ items: [] }),
	[applied, allowed, warehouse, customerKey],
)

const emptyText = computed(() =>
	applied.value ? `Nothing matches "${applied.value}".` : "No sales items found.",
)

function inCart(itemCode) {
	return cart.lines.find((l) => l.item_code === itemCode)
}

let addedTimer = null

function add(item) {
	addItem(item, 1)
	// A brief confirmation on the row itself: the rep is looking at the item
	// they just tapped, not at a toast in the corner.
	added.value = item.item_code
	clearTimeout(addedTimer)
	addedTimer = setTimeout(() => (added.value = null), 1400)
}

function clearSearch() {
	query.value = ""
	applied.value = ""
}
</script>
