<template>
	<div
		class="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1"
		:class="tone.wrap"
	>
		<span class="h-[7px] w-[7px] rounded-full" :class="tone.dot" />
		<span class="text-[11.5px] font-bold" :class="tone.text">{{ label }}</span>
	</div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue"

const props = defineProps({
	pending: { type: Number, default: 0 },
})

// A rep can tell at a glance whether what they just posted actually left the
// handset. Guessing from the last request's success would go stale the moment
// they walk into a basement, so this tracks the browser's own connectivity.
const online = ref(navigator.onLine)

function sync() {
	online.value = navigator.onLine
}

onMounted(() => {
	window.addEventListener("online", sync)
	window.addEventListener("offline", sync)
})

onUnmounted(() => {
	window.removeEventListener("online", sync)
	window.removeEventListener("offline", sync)
})

const label = computed(() => {
	if (props.pending > 0) return `${props.pending} queued`
	return online.value ? "Synced" : "Offline"
})

const tone = computed(() => {
	if (!online.value)
		return {
			wrap: "bg-bad-wash border-bad-border",
			dot: "bg-bad",
			text: "text-bad-ink",
		}
	if (props.pending > 0)
		return {
			wrap: "bg-warn-wash border-warn-border",
			dot: "bg-[#F79009]",
			text: "text-[#B54708]",
		}
	return {
		wrap: "bg-ok-wash border-ok-border",
		dot: "bg-[#17B26A]",
		text: "text-[#067647]",
	}
})
</script>
