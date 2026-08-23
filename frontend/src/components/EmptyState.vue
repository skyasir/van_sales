<template>
	<div
		class="flex flex-col items-center rounded-card border border-dashed border-van-border-strong px-4 py-8"
	>
		<p class="text-center text-[13.5px] text-van-faint">{{ text }}</p>
		<slot />
	</div>
</template>

<script setup>
defineProps({ text: { type: String, required: true } })
</script>
