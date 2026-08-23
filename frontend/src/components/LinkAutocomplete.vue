<template>
	<!--
		A field that holds a link to another document.

		This is frappe-ui's Autocomplete wired to a server search rather than a
		static list: a van carries thousands of items and a route hundreds of
		customers, so the options come from the same endpoints the desk uses
		and are fetched as the rep types, not shipped to the handset up front.

		Anyone who has filled in a Sales Invoice on the desk knows this shape
		immediately -- which is the whole reason to use the framework's control
		rather than build another one.
	-->
	<Autocomplete
		:model-value="modelValue"
		:options="options"
		:loading="loading"
		:label="label"
		:placeholder="placeholder"
		@update:query="onQuery"
		@update:model-value="$emit('update:modelValue', $event)"
	/>
</template>

<script setup>
import { Autocomplete } from "frappe-ui"
import { onBeforeUnmount, ref } from "vue"

const props = defineProps({
	modelValue: { type: [Object, String, Number, null], default: null },
	label: { type: String, default: "" },
	placeholder: { type: String, default: "Search" },
	/** Called with the search text; debounced here. */
	fetch: { type: Function, required: true },
})

defineEmits(["update:modelValue"])

const options = ref([])
const loading = ref(false)

// Debounced so typing does not fire a request per keystroke on a phone that
// may be on a weak connection.
let timer = null
let token = 0

function onQuery(query) {
	clearTimeout(timer)
	loading.value = true
	const mine = ++token

	timer = setTimeout(async () => {
		try {
			const result = await props.fetch(String(query ?? "").trim())
			if (mine !== token) return
			options.value = result
		} catch {
			if (mine === token) options.value = []
		} finally {
			if (mine === token) loading.value = false
		}
	}, 250)
}

// Prime the list so opening the field shows something before a key is hit.
onQuery("")

onBeforeUnmount(() => clearTimeout(timer))
</script>
