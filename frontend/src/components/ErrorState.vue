<template>
	<div
		class="rounded-card border p-4"
		:class="offline ? 'border-warn-border bg-warn-wash' : 'border-bad-border bg-bad-wash'"
	>
		<p class="text-[13.5px] font-bold" :class="offline ? 'text-warn-ink' : 'text-bad-ink'">
			{{ offline ? "No connection" : "Could not load" }}
		</p>
		<p
			class="mt-1 text-[12.5px] leading-[18px]"
			:class="offline ? 'text-warn-ink' : 'text-bad-ink'"
		>
			{{ message }}
		</p>

		<!-- Retry is only offered when the request never arrived. Re-sending a
		     request the server deliberately rejected just fails again, more
		     slowly, and teaches the rep to distrust the button. -->
		<Button v-if="offline && onRetry" class="mt-3" variant="subtle" @click="onRetry">
			Try again
		</Button>
	</div>
</template>

<script setup>
import { Button } from "frappe-ui"

defineProps({
	message: { type: String, default: "Something went wrong." },
	offline: { type: Boolean, default: false },
	onRetry: { type: Function, default: null },
})
</script>
