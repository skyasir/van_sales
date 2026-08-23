<template>
	<div class="rounded-xl border p-3" :class="tone.wrap">
		<p class="text-[13.5px] font-bold" :class="tone.text">{{ title }}</p>
		<p v-if="body" class="mt-0.5 text-[12.5px] leading-[18px] opacity-90" :class="tone.text">
			{{ body }}
		</p>
		<slot />
	</div>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
	title: { type: String, required: true },
	body: { type: String, default: "" },
	variant: {
		type: String,
		default: "info",
		validator: (v) => ["info", "success", "warning", "danger"].includes(v),
	},
})

const tone = computed(
	() =>
		({
			info: { wrap: "bg-brand-wash border-brand-border", text: "text-brand-dark" },
			success: { wrap: "bg-ok-wash border-ok-border", text: "text-ok-ink" },
			warning: { wrap: "bg-warn-wash border-warn-border", text: "text-warn-ink" },
			danger: { wrap: "bg-bad-wash border-bad-border", text: "text-bad-ink" },
		})[props.variant],
)
</script>
