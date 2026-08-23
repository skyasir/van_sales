<template>
	<div class="flex justify-between gap-2">
		<span class="shrink-0">{{ label }}</span>
		<span class="truncate text-right">{{ value }}</span>
	</div>
</template>

<script setup>
defineProps({
	label: { type: String, required: true },
	value: { type: [String, Number], default: "" },
})
</script>
