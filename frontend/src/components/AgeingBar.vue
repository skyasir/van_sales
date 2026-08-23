<template>
	<div
		class="flex overflow-hidden rounded-sm bg-surface-gray-2"
		:style="{ height: `${height}px` }"
		role="img"
		:aria-label="ariaLabel"
	>
		<div
			v-for="(segment, i) in visible"
			:key="i"
			:class="segment.class"
			:style="{ flex: segment.value }"
		/>
	</div>
</template>

<script setup>
import { computed } from "vue"

import { money } from "../data/format"

const props = defineProps({
	segments: { type: Array, required: true },
	height: { type: Number, default: 8 },
	label: { type: String, default: "Ageing" },
})

const visible = computed(() => props.segments.filter((seg) => seg.value > 0))

// A bar with no text is invisible to a screen reader; spelling the split out
// keeps the same information available.
const ariaLabel = computed(
	() => `${props.label}: ` + props.segments.map((s) => `${s.name} ${money(s.value)}`).join(", "),
)
</script>
