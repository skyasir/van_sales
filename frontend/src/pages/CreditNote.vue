<template>
	<!--
		Raising a credit note.

		Two shapes, one screen. Against an invoice, the lines come from that
		invoice and quantities are capped at what was sold -- referencing the
		parent is what ties the credit to a price the customer actually paid
		and lets ERPNext settle the original. Standalone, the rep picks the
		customer and the items themselves, for the cases a reference cannot
		cover: goods sold before the system went live, a negotiated allowance,
		or a return whose invoice cannot be found at the door.

		The reason on each line decides where the goods land: good stock
		returns to the van and can be sold again, damaged or expired does not.
		Getting that wrong quietly puts spoiled foodstuff back into saleable
		inventory, so it is asked per line rather than once for the document.
	-->
	<div class="flex min-h-full flex-col">
		<PageHeader
			title="Credit note"
			:subtitle="standalone ? 'Standalone' : `Against ${against}`"
			back
		/>

		<div class="flex-1">
			<ScreenBody>
				<div v-if="doc.loading.value && !standalone && !d" class="py-6 text-center">
					<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
				</div>

				<ErrorState
					v-else-if="doc.error.value"
					:message="doc.error.value"
					:offline="doc.offline.value"
					:on-retry="doc.reload"
				/>

				<template v-else>
					<!-- Standalone needs a customer; against an invoice the customer
					     is already settled by the parent document. -->
					<div
						v-if="standalone"
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
					>
						<LinkAutocomplete
							label="Customer"
							placeholder="Select a customer"
							:model-value="customerOption"
							:fetch="searchCustomerOptions"
							@update:model-value="pickCustomer"
						/>
					</div>

					<div
						v-else-if="d"
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
					>
						<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
							Against
						</p>
						<p class="money mt-1 text-[15px] font-semibold text-ink-gray-8">
							{{ d.name }}
						</p>
						<p class="mt-0.5 text-[12.5px] text-ink-gray-6">
							{{ d.customer_name }} · {{ shortDate(d.posting_date, true) }}
						</p>
					</div>

					<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
						Lines to credit
					</p>

					<EmptyState v-if="!lines.length" :text="emptyText" />

					<template v-else>
						<div
							v-for="line in lines"
							:key="line.item_code"
							class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
						>
							<div class="flex gap-2.5">
								<div class="min-w-0 flex-1">
									<p
										class="text-[14.5px] font-semibold leading-[19px] text-ink-gray-8"
									>
										{{ line.item_name }}
									</p>
									<p
										class="money mt-1 truncate text-[11.5px] font-medium text-ink-gray-5"
									>
										{{ line.item_code }} · {{ line.uom }} ·
										{{ money(line.rate) }}
										<template v-if="line.sold !== undefined">
											· sold {{ qty(line.sold) }}
										</template>
									</p>
								</div>
								<button
									v-if="standalone"
									type="button"
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-outline-gray-2 active:bg-surface-gray-2"
									:aria-label="`Remove ${line.item_name}`"
									@click="removePicked(line.item_code)"
								>
									<FeatherIcon name="x" class="h-4 w-4 text-ink-gray-5" />
								</button>
							</div>

							<div class="mt-3 flex items-center justify-between">
								<QtyStepper
									:model-value="line.returning"
									:label="line.item_name"
									@update:model-value="
										(v) => setLineQty(line.item_code, v, line.sold)
									"
								/>
								<span class="money text-[17px] font-semibold text-ink-gray-8">
									{{ money(line.returning * line.rate) }}
								</span>
							</div>

							<!-- Asked per line, never once for the document: one carton
							     back in good order and one crushed is the ordinary case,
							     not the exception. -->
							<div
								v-if="line.returning > 0"
								class="mt-3 border-t border-outline-gray-1 pt-3"
							>
								<p
									class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5"
								>
									Reason
								</p>
								<TabButtons
									class="mt-2"
									:model-value="line.reason"
									:buttons="REASONS"
									@update:model-value="(v) => (reasons[line.item_code] = v)"
								/>
								<p class="mt-1.5 text-[11.5px] text-ink-gray-5">
									{{ reasonHint(line.reason) }}
								</p>
							</div>
						</div>
					</template>

					<LinkAutocomplete
						v-if="standalone"
						placeholder="Add item"
						:model-value="null"
						:fetch="searchItemOptions"
						@update:model-value="pickItem"
					/>

					<Alert v-if="error" theme="red" title="Not raised" :dismissable="false">
						{{ error }}
					</Alert>
				</template>
			</ScreenBody>
		</div>

		<div
			v-if="lines.length"
			class="sticky bottom-0 border-t border-outline-gray-2 bg-surface-white p-3.5 pb-4"
		>
			<div class="flex items-baseline justify-between">
				<span class="text-[15px] font-semibold text-ink-gray-8">Credit total</span>
				<span class="money text-2xl font-semibold -tracking-[0.02em] text-ink-red-3">
					{{ money(creditTotal) }}
				</span>
			</div>
			<Button
				class="mt-3 h-[54px] w-full"
				variant="solid"
				theme="red"
				:loading="posting"
				:disabled="!ready || posting"
				@click="post"
			>
				Raise credit note
			</Button>
		</div>
	</div>
</template>

<script setup>
import { Alert, Button, FeatherIcon, LoadingIndicator, TabButtons } from "frappe-ui"
import { computed, reactive, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import LinkAutocomplete from "../components/LinkAutocomplete.vue"
import PageHeader from "../components/PageHeader.vue"
import QtyStepper from "../components/QtyStepper.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { money, qty, shortDate } from "../data/format"
import { capturedAt, captureGeo, newClientUid } from "../data/geo"
import { ApiError } from "../data/request"
import { policy, session } from "../data/session"
import { useAsync } from "../data/useAsync"

const REASONS = [
	{ label: "Good stock", value: "good", hint: "Returns to the van and can be sold again" },
	{ label: "Damaged", value: "damaged", hint: "Does not go back into saleable stock" },
	{ label: "Expired", value: "expired", hint: "Does not go back into saleable stock" },
]

const route = useRoute()
const router = useRouter()

const raw = computed(() => String(route.params.invoice ?? ""))
const standalone = computed(() => raw.value === "new" || !raw.value)
const against = computed(() => (standalone.value ? "" : raw.value))

const doc = useAsync(
	() => (standalone.value ? Promise.resolve(null) : api.invoiceForPrint(against.value)),
	[against, standalone],
)
const d = computed(() => doc.data.value)

const customer = ref(null)
const customerOption = computed(() =>
	customer.value ? { label: customer.value.customer_name, value: customer.value.name } : null,
)
const picked = ref([])
const qtys = reactive({})
const reasons = reactive({})
const posting = ref(false)
const error = ref(null)

// Fixed for the life of the screen so a retry cannot credit twice.
const clientUid = newClientUid()

const source = computed(() =>
	standalone.value
		? picked.value.map((i) => ({
				item_code: i.item_code,
				item_name: i.item_name,
				uom: i.uom,
				rate: i.rate,
			}))
		: (d.value?.items ?? []).map((i) => ({
				item_code: i.item_code,
				item_name: i.item_name,
				uom: i.uom,
				rate: i.rate,
				/** How many were sold. Absent on a standalone credit, which has no cap. */
				sold: i.qty,
			})),
)

const lines = computed(() =>
	source.value.map((item) => ({
		...item,
		returning: qtys[item.item_code] ?? 0,
		reason: reasons[item.item_code] ?? "good",
	})),
)

const creditTotal = computed(() => lines.value.reduce((sum, l) => sum + l.returning * l.rate, 0))

const anything = computed(() => lines.value.some((l) => l.returning > 0))
const ready = computed(() => anything.value && (!standalone.value || Boolean(customer.value)))

const emptyText = computed(() =>
	standalone.value ? "No items yet. Add what is coming back." : "This invoice has no lines.",
)

function reasonHint(key) {
	return REASONS.find((r) => r.value === key)?.hint ?? ""
}

function setLineQty(code, next, cap) {
	qtys[code] = Math.max(0, cap === undefined ? next : Math.min(cap, next))
}

function removePicked(code) {
	picked.value = picked.value.filter((i) => i.item_code !== code)
	delete qtys[code]
	delete reasons[code]
}

async function searchCustomerOptions(query) {
	const result = await api.listCustomers({ search: query || undefined, limit: 40 })
	return result.customers.map((c) => ({ ...c, label: c.customer_name, value: c.name }))
}

async function searchItemOptions(query) {
	const result = await api.searchItems({
		query: query || undefined,
		warehouse: session.van?.warehouse,
		customer: customer.value?.name,
		price_list: session.van?.price_list,
		company: session.van?.company,
		currency: session.van?.currency,
		limit: 40,
	})
	return result.items.map((i) => ({ ...i, label: i.item_name, value: i.item_code }))
}

function pickCustomer(option) {
	customer.value = option?.value ? { ...option, name: option.value } : null
}

function pickItem(option) {
	if (!option?.value) return
	if (!picked.value.some((i) => i.item_code === option.item_code)) {
		picked.value = [...picked.value, option]
	}
	setLineQty(option.item_code, (qtys[option.item_code] ?? 0) + 1)
}

async function post() {
	if (!ready.value) return
	posting.value = true
	error.value = null

	try {
		const geo = await captureGeo(Boolean(policy.value.capture_gps))
		const result = await api.createReturn({
			client_uid: clientUid,
			return_against: standalone.value ? undefined : against.value,
			customer: standalone.value ? customer.value?.name : undefined,
			profile: standalone.value ? session.van?.profile : undefined,
			items: lines.value
				.filter((l) => l.returning > 0)
				.map((l) => ({ item_code: l.item_code, qty: l.returning, reason: l.reason })),
			submit: 1,
			geo,
			captured_at: capturedAt(),
		})

		router.replace({ name: "invoice-view", params: { name: result.name } })
	} catch (e) {
		error.value = e instanceof ApiError ? e.message : "Could not raise the credit note."
	} finally {
		posting.value = false
	}
}
</script>
