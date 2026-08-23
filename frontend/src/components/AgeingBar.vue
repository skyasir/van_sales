<template>
	<div
		class="flex overflow-hidden rounded bg-van-subtle"
		:style="{ height: `${height}px` }"
		role="img"
		:aria-label="ariaLabel"
	>
		<template v-if="total > 0">
			<div
				v-for="(segment, i) in visible"
				:key="i"
				:style="{ flex: segment.value, backgroundColor: segment.color }"
			/>
		</template>
	</div>
</template>

<script setup>
import { computed } from "vue"

import { money } from "../data/format"

const props = defineProps({
	segments: { type: Array, required: true },
	height: { type: Number, default: 7 },
	label: { type: String, default: "Ageing" },
})

const total = computed(() => props.segments.reduce((sum, seg) => sum + Math.max(0, seg.value), 0))

const visible = computed(() => props.segments.filter((seg) => seg.value > 0))

// A bar with no text is invisible to a screen reader; spelling the split out
// keeps the same information available.
const ariaLabel = computed(
	() =>
		`${props.label}: ` +
		props.segments.map((seg) => `${seg.name} ${money(seg.value)}`).join(", "),
)
</script>
