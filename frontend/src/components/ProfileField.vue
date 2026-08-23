<template>
	<div class="flex flex-col gap-1">
		<span class="section-label">{{ label }}</span>

		<input
			v-if="editing"
			:value="modelValue"
			:type="type"
			class="h-12 rounded-xl border border-van-border bg-van-card px-3.5 text-[15px] text-van-text placeholder:text-van-placeholder focus:border-brand focus:outline-none"
			:class="{ 'font-mono': mono }"
			@input="$emit('update:modelValue', $event.target.value)"
		/>

		<!-- Locked fields read as text, not as a greyed-out input. A disabled
		     box invites tapping; plain text says "this is not yours to edit". -->
		<p v-else class="text-[15px] text-van-text" :class="{ money: mono }">
			{{ modelValue || "—" }}
		</p>
	</div>
</template>

<script setup>
defineProps({
	label: { type: String, required: true },
	modelValue: { type: [String, Number], default: "" },
	editing: { type: Boolean, default: false },
	mono: { type: Boolean, default: false },
	type: { type: String, default: "text" },
})

defineEmits(["update:modelValue"])
</script>
