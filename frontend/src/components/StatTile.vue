<template>
	<!-- A figure and its label. Frappe UI has no stat tile, so this is built
	     from its surface and ink tokens rather than a palette of its own. -->
	<div class="flex-1 rounded-md p-3" :class="surface">
		<p class="text-p-sm text-ink-gray-5">{{ label }}</p>
		<p class="money mt-1 text-lg font-semibold" :class="ink">{{ value }}</p>
	</div>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
	label: { type: String, required: true },
	value: { type: String, required: true },
	tone: {
		type: String,
		default: "gray",
		validator: (v) => ["gray", "green", "red"].includes(v),
	},
})

const surface = computed(
	() =>
		({ gray: "bg-surface-gray-2", green: "bg-surface-green-2", red: "bg-surface-red-2" })[
			props.tone
		],
)

const ink = computed(
	() =>
		({ gray: "text-ink-gray-8", green: "text-ink-green-3", red: "text-ink-red-4" })[props.tone],
)
</script>
