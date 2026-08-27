<template>
	<!-- Posted invoice + the 58mm receipt preview. -->
	<div>
		<PageHeader title="Invoice posted" :subtitle="name" :back="{ name: 'van_home' }" />

		<ScreenBody>
			<Alert
				theme="green"
				:title="`Posted · ${name}`"
				:dismissable="false"
				description="Recorded in ERPNext."
			/>

			<div v-if="doc.loading.value && !d" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
			</div>

			<ErrorState
				v-else-if="doc.error.value"
				:message="doc.error.value"
				:offline="doc.offline.value"
				:on-retry="doc.reload"
			/>

			<ReceiptPaper v-else-if="d" :d="d" />

			<div class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5">
				<p class="text-[13.5px] font-semibold text-ink-gray-8">Thermal printer</p>
				<p class="mt-0.5 text-[11.5px] leading-4 text-ink-gray-5">
					Not connected. Bluetooth ESC/POS printing is planned but not built yet.
				</p>
			</div>

			<div class="flex gap-2.5">
				<Button
					class="h-touch flex-1"
					variant="outline"
					@click="router.replace({ name: 'van_home' })"
				>
					Next customer
				</Button>
				<Button
					class="h-touch flex-1"
					variant="solid"
					theme="blue"
					@click="router.push({ name: 'invoice-view', params: { name } })"
				>
					View invoice
				</Button>
			</div>
		</ScreenBody>
	</div>
</template>

<script setup>
import { Alert, Button, LoadingIndicator } from "frappe-ui"
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

import ErrorState from "../components/ErrorState.vue"
import PageHeader from "../components/PageHeader.vue"
import ReceiptPaper from "../components/ReceiptPaper.vue"
import ScreenBody from "../components/ScreenBody.vue"
import { api } from "../data/api"
import { useAsync } from "../data/useAsync"

const route = useRoute()
const router = useRouter()

const name = computed(() => String(route.params.name ?? ""))
const doc = useAsync(() => api.invoiceForPrint(name.value), [name])
const d = computed(() => doc.data.value)
</script>
