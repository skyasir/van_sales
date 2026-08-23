<template>
	<div class="flex items-center gap-1">
		<Button
			size="lg"
			icon="minus"
			:disabled="modelValue <= min"
			:aria-label="`Reduce ${label}`"
			@click="step(-1)"
		/>

		<TextInput
			:model-value="String(modelValue)"
			type="number"
			size="lg"
			class="money w-16 text-center"
			:aria-label="`Quantity of ${label}`"
			@update:model-value="onInput"
		/>

		<Button size="lg" icon="plus" :aria-label="`Add one ${label}`" @click="step(1)" />
	</div>
</template>

<script setup>
import { Button, TextInput } from "frappe-ui"

const props = defineProps({
	modelValue: { type: Number, required: true },
	label: { type: String, default: "item" },
	min: { type: Number, default: 0 },
})

const emit = defineEmits(["update:modelValue"])

function step(by) {
	emit("update:modelValue", Math.max(props.min, props.modelValue + by))
}

function onInput(value) {
	const next = Number(value)
	// A half-typed number is not a reason to reset the line to zero, so a
	// non-numeric intermediate state is simply ignored.
	if (!Number.isFinite(next)) return
	emit("update:modelValue", Math.max(props.min, next))
}
</script>
