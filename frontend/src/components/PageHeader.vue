<template>
	<header
		class="safe-top flex items-center gap-3 border-b border-outline-gray-2 bg-surface-white px-4 pb-3 pt-3"
	>
		<Button v-if="back" size="md" icon="chevron-left" aria-label="Back" @click="goBack" />

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-lg font-semibold text-ink-gray-9">{{ title }}</h1>
			<p v-if="subtitle" class="truncate text-p-sm text-ink-gray-5">{{ subtitle }}</p>
		</div>

		<slot name="right">
			<SyncPill />
		</slot>
	</header>
</template>

<script setup>
import { Button } from "frappe-ui"
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
