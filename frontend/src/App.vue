<template>
	<!-- Nothing renders until the session has been restored, so the app never
	     flashes the login screen at a rep who is already signed in. -->
	<div v-if="!session.ready" class="flex h-full items-center justify-center bg-van-bg">
		<LoadingIndicator class="h-6 w-6 text-brand" />
	</div>

	<router-view v-else />

	<Toast />
</template>

<script setup>
import { onMounted } from "vue"
import { LoadingIndicator, Toast } from "frappe-ui"

import { restore, session } from "./data/session"

onMounted(restore)
</script>
