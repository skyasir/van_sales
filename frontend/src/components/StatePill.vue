<template>
	<span class="rounded-[9px] px-2 py-[3px] text-[11px] font-bold" :class="tone">
		{{ label }}
	</span>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
	label: { type: String, required: true },
	variant: {
		type: String,
		default: "neutral",
		validator: (v) => ["neutral", "success", "warning", "danger", "info"].includes(v),
	},
})

const tone = computed(
	() =>
		({
			neutral: "bg-van-subtle text-van-muted",
			success: "bg-ok-wash text-ok-ink",
			warning: "bg-warn-wash text-warn-ink",
			danger: "bg-bad-wash text-bad-ink",
			info: "bg-brand-wash text-brand-dark",
		})[props.variant],
)
</script>
