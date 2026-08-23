<template>
	<div class="flex-1 rounded-[10px] bg-white/[0.07] p-2.5">
		<p class="text-[10.5px] font-bold uppercase tracking-[0.06em] text-white/50">
			{{ label }}
		</p>
		<p class="money mt-1 text-base font-semibold text-white">{{ value }}</p>
	</div>
</template>

<script setup>
defineProps({
	label: { type: String, required: true },
	value: { type: String, required: true },
})
</script>
