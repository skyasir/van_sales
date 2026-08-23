<template>
	<!--
		The 58mm receipt preview.

		Rendered from the posted document, never from the basket. The rep must
		be looking at what ERPNext actually recorded -- including the document
		number and the tax it applied -- rather than at the app's idea of the
		sale.

		Bluetooth printing is not built yet; this layout is the exact content
		that will be fed to the ESC/POS encoder when it is.
	-->
	<!-- Paper-white in both themes on purpose: this is a preview of a 58mm
	     thermal slip, and the printer has no dark mode. -->
	<div class="flex justify-center">
		<div
			class="w-full max-w-[302px] bg-white p-3 font-mono text-[11px] leading-[16px] text-black shadow-sm"
		>
			<p class="text-center font-bold">{{ d.company.company_name.toUpperCase() }}</p>
			<p v-if="d.company.tax_id" class="text-center text-[10px]">
				TRN {{ d.company.tax_id }}
			</p>
			<p class="text-center text-[10px]">TAX INVOICE</p>

			<div class="my-1.5 border-t border-dashed border-black/40" />

			<PaperRow label="No" :value="d.name" />
			<PaperRow label="Date" :value="shortDate(d.posting_date, true)" />
			<PaperRow label="Cust" :value="d.customer" />
			<PaperRow v-if="d.customer_tax_id" label="TRN" :value="d.customer_tax_id" />

			<div class="my-1.5 border-t border-dashed border-black/40" />

			<div v-for="(item, i) in d.items" :key="i" class="mb-1.5">
				<p class="truncate">{{ item.item_name }}</p>
				<div class="flex justify-between">
					<span>{{ qty(item.qty) }} x {{ money(item.rate) }}</span>
					<span>{{ money(item.amount) }}</span>
				</div>
			</div>

			<div class="my-1.5 border-t border-dashed border-black/40" />

			<PaperRow label="Subtotal" :value="money(d.net_total)" />
			<PaperRow
				v-for="(tax, i) in d.taxes"
				:key="i"
				:label="tax.description"
				:value="money(tax.amount)"
			/>

			<div class="mt-1 flex justify-between font-bold">
				<span>TOTAL {{ d.currency }}</span>
				<span>{{ money(d.rounded_total) }}</span>
			</div>

			<div class="my-1.5 border-t border-dashed border-black/40" />

			<PaperRow label="Outstanding" :value="money(d.outstanding_amount)" />

			<p class="mt-3 whitespace-pre-line text-center text-[10px]">
				Goods once sold are not returnable without prior approval
			</p>

			<!-- Stands in for the code the printer will render. Faking a real
			     barcode here would invite someone to try scanning the screen. -->
			<div
				class="mx-auto mt-2 h-8 w-3/4 bg-[repeating-linear-gradient(90deg,#000_0_2px,#fff_2px_4px)]"
			/>
			<p class="mt-1 text-center text-[10px]">{{ d.name }}</p>
		</div>
	</div>
</template>

<script setup>
import PaperRow from "./PaperRow.vue"
import { money, qty, shortDate } from "../data/format"

defineProps({ d: { type: Object, required: true } })
</script>
