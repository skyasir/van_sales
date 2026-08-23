<template>
	<div class="flex w-full items-center gap-3">
		<div class="min-w-0 flex-1">
			<p class="truncate text-base font-medium text-ink-gray-8">{{ row.customer_name }}</p>
			<p class="money mt-0.5 truncate text-p-sm text-ink-gray-5">
				{{ row.name }}{{ row.payment_terms ? ` · ${row.payment_terms}` : "" }}
			</p>
		</div>
		<div class="shrink-0 text-right">
			<p
				class="money text-base font-medium"
				:class="row.overdue > 0 ? 'text-ink-red-3' : 'text-ink-gray-8'"
			>
				{{ money(row.outstanding) }}
			</p>
			<p class="text-p-sm text-ink-gray-4">
				{{ row.overdue > 0 ? `${row.overdue_invoices} overdue` : "due" }}
			</p>
		</div>
	</div>
</template>

<script setup>
import { money } from "../data/format"

defineProps({ row: { type: Object, required: true } })
</script>
