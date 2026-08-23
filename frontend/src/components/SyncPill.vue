<template>
	<Badge :theme="theme" variant="subtle" size="sm">{{ label }}</Badge>
</template>

<script setup>
import { Badge } from "frappe-ui"
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

const theme = computed(() => {
	if (!online.value) return "red"
	return props.pending > 0 ? "orange" : "green"
})
</script>
