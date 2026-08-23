<template>
	<!-- What is on the van, not what the warehouse holds: a rep cannot sell
	     stock that is not in the vehicle. -->
	<Badge :theme="out ? 'red' : 'green'" variant="subtle" size="sm">
		{{ out ? "Out of stock" : `Available in van: ${qty(vanQty)} ${uom}` }}
	</Badge>
</template>

<script setup>
import { Badge } from "frappe-ui"
import { computed } from "vue"

import { qty } from "../data/format"

const props = defineProps({
	vanQty: { type: Number, required: true },
	uom: { type: String, default: "" },
})

const out = computed(() => props.vanQty <= 0)
</script>
