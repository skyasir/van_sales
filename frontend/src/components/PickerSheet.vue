<template>
	<!--
		The link-field picker.

		Tapping a Customer or Item field opens this: a search box and a list to
		choose from, the same move as clicking a Link field on the desk. It is a
		sheet rather than a route on purpose -- picking a customer should not
		navigate away from the invoice being built and lose what is already on it.

		Rows are rendered by the caller, so the customer picker can show a
		balance and the item picker a price and van quantity, while both keep
		the same search-and-select behaviour.
	-->
	<Teleport to="#modals">
		<div v-if="open" class="fixed inset-0 z-50 flex flex-col">
			<button
				type="button"
				class="flex-1 bg-[rgba(16,24,40,0.45)]"
				aria-label="Close"
				@click="close"
			/>

			<div class="safe-bottom flex h-[82%] flex-col rounded-t-panel bg-van-card px-3.5">
				<div class="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-sm bg-van-border-strong" />

				<div class="flex shrink-0 items-center justify-between py-3">
					<h2 class="text-[17px] font-semibold -tracking-[0.01em] text-van-text">
						{{ title }}
					</h2>
					<button
						type="button"
						class="flex h-8 w-8 items-center justify-center rounded-full bg-van-bg"
						aria-label="Close"
						@click="close"
					>
						<FeatherIcon name="x" class="h-5 w-5 text-van-muted" />
					</button>
				</div>

				<div
					class="mb-2 flex h-[46px] shrink-0 items-center gap-2.5 rounded-xl border border-van-border bg-van-bg px-3"
				>
					<FeatherIcon name="search" class="h-4 w-4 shrink-0 text-van-placeholder" />
					<input
						ref="searchBox"
						v-model="query"
						type="search"
						:placeholder="placeholder"
						autocomplete="off"
						autocapitalize="none"
						autocorrect="off"
						class="min-w-0 flex-1 bg-transparent text-[15px] text-van-text placeholder:text-van-placeholder focus:outline-none"
					/>
					<LoadingIndicator
						v-if="loading"
						class="h-4 w-4 shrink-0 text-van-placeholder"
					/>
				</div>

				<slot name="header" />

				<div class="min-h-0 flex-1 overflow-y-auto pb-4">
					<p v-if="error" class="px-4 py-8 text-center text-[13.5px] text-bad">
						{{ error }}
					</p>

					<p
						v-else-if="!loading && !rows.length"
						class="px-4 py-8 text-center text-[13.5px] text-van-faint"
					>
						{{ emptyText }}
					</p>

					<button
						v-for="row in rows"
						:key="keyFor(row)"
						type="button"
						class="w-full border-b border-van-subtle px-0.5 py-3 text-left active:bg-van-bg"
						@click="select(row)"
					>
						<slot name="row" :row="row" />
					</button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { FeatherIcon, LoadingIndicator } from "frappe-ui"
import { nextTick, ref, watch } from "vue"

import { ApiError } from "../data/request"

const props = defineProps({
	open: { type: Boolean, default: false },
	title: { type: String, required: true },
	placeholder: { type: String, default: "Search" },
	/** Called with the search text; debounced by the sheet. */
	fetch: { type: Function, required: true },
	keyFor: { type: Function, required: true },
	emptyText: { type: String, default: "Nothing found." },
})

const emit = defineEmits(["close", "select"])

const query = ref("")
const rows = ref([])
const loading = ref(false)
const error = ref(null)
const searchBox = ref(null)

function close() {
	emit("close")
}

function select(row) {
	emit("select", row)
}

// Reset each time it opens, so a previous search never greets the user.
watch(
	() => props.open,
	(open) => {
		if (!open) return
		query.value = ""
		error.value = null
		nextTick(() => searchBox.value?.focus())
	},
)

// Debounced so typing does not fire a request per keystroke on a phone that
// may be on a weak connection.
let timer = null
let token = 0

watch(
	[() => props.open, query],
	([open, text]) => {
		clearTimeout(timer)
		if (!open) return

		loading.value = true
		const mine = ++token

		timer = setTimeout(async () => {
			try {
				const result = await props.fetch(text.trim())
				if (mine !== token) return
				rows.value = result
				error.value = null
			} catch (e) {
				if (mine !== token) return
				rows.value = []
				error.value = e instanceof ApiError ? e.message : "Search failed."
			} finally {
				if (mine === token) loading.value = false
			}
		}, 250)
	},
	{ immediate: true },
)
</script>
