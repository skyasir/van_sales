<template>
	<!--
		Editable fields are real form controls; locked ones are plain text.

		A disabled input invites tapping and then refuses, which reads as a
		bug. Rendering HR's record as text says plainly that it is not yours to
		edit -- and which fields those are is the server's call, not this
		component's.
	-->
	<FormControl
		v-if="editing"
		:label="label"
		:type="type"
		size="md"
		:model-value="modelValue"
		@update:model-value="$emit('update:modelValue', $event)"
	/>

	<div v-else class="flex flex-col gap-1">
		<span class="text-p-sm text-ink-gray-5">{{ label }}</span>
		<p class="text-base text-ink-gray-8" :class="{ money: mono }">{{ modelValue || "—" }}</p>
	</div>
</template>

<script setup>
import { FormControl } from "frappe-ui"

defineProps({
	label: { type: String, required: true },
	modelValue: { type: [String, Number], default: "" },
	editing: { type: Boolean, default: false },
	mono: { type: Boolean, default: false },
	type: { type: String, default: "text" },
})

defineEmits(["update:modelValue"])
</script>
