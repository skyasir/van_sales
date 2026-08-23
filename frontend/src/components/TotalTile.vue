<template>
	<div class="flex-1 rounded-xl p-3">
		<p class="text-[10.5px] font-bold uppercase tracking-[0.07em]">{{ label }}</p>
		<p class="money mt-1 text-base font-semibold">{{ value }}</p>
	</div>
</template>

<script setup>
defineProps({
	label: { type: String, required: true },
	value: { type: String, required: true },
})
</script>
