<template>
	<div class="flex gap-3">
		<div class="min-w-0 flex-1">
			<p class="truncate text-[14.5px] font-semibold text-van-text">
				{{ row.customer_name }}
			</p>
			<p class="money mt-0.5 truncate text-[11.5px] font-medium text-van-faint">
				{{ row.name }}{{ row.payment_terms ? ` · ${row.payment_terms}` : "" }}
			</p>
		</div>
		<div class="shrink-0 text-right">
			<p
				class="money text-sm font-semibold"
				:class="row.overdue > 0 ? 'text-bad' : 'text-van-text'"
			>
				{{ money(row.outstanding) }}
			</p>
			<p class="mt-0.5 text-[11px] font-semibold text-van-faint">
				{{ row.overdue > 0 ? `${row.overdue_invoices} overdue` : "due" }}
			</p>
		</div>
	</div>
</template>

<script setup>
import { money } from "../data/format"

defineProps({ row: { type: Object, required: true } })
</script>
