<template>
	<header
		class="safe-top flex items-center gap-3 border-b border-van-border bg-van-card px-4 pb-3.5 pt-3"
	>
		<button
			v-if="back"
			type="button"
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-van-border bg-gray-50 active:bg-van-subtle"
			:aria-label="`Back`"
			@click="goBack"
		>
			<FeatherIcon name="chevron-left" class="h-5 w-5 text-van-text" />
		</button>

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-base font-semibold -tracking-[0.01em] text-van-text">
				{{ title }}
			</h1>
			<p v-if="subtitle" class="mt-0.5 truncate text-[11.5px] text-van-muted">
				{{ subtitle }}
			</p>
		</div>

		<slot name="right">
			<SyncPill />
		</slot>
	</header>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"
import { useRouter } from "vue-router"

import SyncPill from "./SyncPill.vue"

const props = defineProps({
	title: { type: String, required: true },
	subtitle: { type: String, default: "" },
	back: { type: [Boolean, Object, String], default: false },
})

const router = useRouter()

function goBack() {
	// A named target beats history when the screen can be reached from more
	// than one place -- a receipt opened from the route and from a customer
	// must both land somewhere sensible.
	if (typeof props.back === "object" || typeof props.back === "string") {
		router.replace(props.back)
	} else if (window.history.state?.back) {
		router.back()
	} else {
		router.replace({ name: "gate" })
	}
}
</script>
