<template>
	<!-- What is on the van, not what the warehouse holds: a rep cannot sell
	     stock that is not in the vehicle. -->
	<span
		class="inline-flex items-center gap-1.5 rounded-[9px] px-2 py-1"
		:class="out ? 'bg-bad-wash' : 'bg-ok-wash'"
	>
		<span class="h-1.5 w-1.5 rounded-full" :class="out ? 'bg-bad' : 'bg-ok'" />
		<span class="text-[11.5px] font-bold" :class="out ? 'text-[#B42318]' : 'text-ok-ink'">
			{{ out ? "Out of stock" : `Available in van: ${qty(vanQty)} ${uom}` }}
		</span>
	</span>
</template>

<script setup>
import { computed } from "vue"

import { qty } from "../data/format"

const props = defineProps({
	vanQty: { type: Number, required: true },
	uom: { type: String, default: "" },
})

const out = computed(() => props.vanQty <= 0)
</script>
