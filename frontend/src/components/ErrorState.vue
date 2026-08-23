<template>
	<!--
		Retry is only offered when the request never arrived. Re-sending one the
		server deliberately rejected just fails again, more slowly, and teaches
		the rep to distrust the button.
	-->
	<Alert
		:title="offline ? 'No connection' : 'Could not load'"
		:theme="offline ? 'yellow' : 'red'"
		:dismissable="false"
	>
		{{ message }}

		<template v-if="offline && onRetry" #footer>
			<Button size="sm" @click="onRetry">Try again</Button>
		</template>
	</Alert>
</template>

<script setup>
import { Alert, Button } from "frappe-ui"

defineProps({
	message: { type: String, default: "Something went wrong." },
	offline: { type: Boolean, default: false },
	onRetry: { type: Function, default: null },
})
</script>
