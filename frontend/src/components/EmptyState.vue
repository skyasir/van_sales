<template>
	<div
		class="flex flex-col items-center rounded-lg border border-dashed border-outline-gray-2 px-4 py-8"
	>
		<p class="text-center text-base text-ink-gray-5">{{ text }}</p>
		<slot />
	</div>
</template>

<script setup>
defineProps({ text: { type: String, required: true } })
</script>
