<template>
	<div class="flex h-full flex-col bg-van-bg">
		<!-- The cached session outlived the server's offline window. The rep is
		     not thrown out mid-round; they are told, and sent to sign in. -->
		<div
			v-if="session.staleSession"
			class="safe-top bg-warn-wash px-4 py-2 text-[12.5px] text-warn-ink"
		>
			Your offline session has expired. Sign in again to keep selling.
		</div>

		<main class="min-h-0 flex-1 overflow-y-auto">
			<router-view v-slot="{ Component }">
				<component :is="Component" />
			</router-view>
		</main>

		<TabBar />
	</div>
</template>

<script setup>
import TabBar from "./TabBar.vue"
import { session } from "../data/session"
</script>
