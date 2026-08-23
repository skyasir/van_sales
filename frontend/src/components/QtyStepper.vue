<template>
	<div class="flex items-center gap-1">
		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-[9px] border border-van-border-strong bg-van-card active:bg-van-subtle disabled:opacity-40"
			:disabled="modelValue <= min"
			:aria-label="`Reduce ${label}`"
			@click="step(-1)"
		>
			<FeatherIcon name="minus" class="h-4 w-4 text-van-text" />
		</button>

		<input
			:value="modelValue"
			type="number"
			inputmode="decimal"
			:aria-label="`Quantity of ${label}`"
			class="money h-9 w-14 rounded-[9px] border border-van-border-strong bg-van-card text-center text-sm font-semibold text-van-text focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
			@input="onInput"
		/>

		<button
			type="button"
			class="flex h-9 w-9 items-center justify-center rounded-[9px] border border-van-border-strong bg-van-card active:bg-van-subtle"
			:aria-label="`Add one ${label}`"
			@click="step(1)"
		>
			<FeatherIcon name="plus" class="h-4 w-4 text-van-text" />
		</button>
	</div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"

const props = defineProps({
	modelValue: { type: Number, required: true },
	label: { type: String, default: "item" },
	min: { type: Number, default: 0 },
})

const emit = defineEmits(["update:modelValue"])

function step(by) {
	emit("update:modelValue", Math.max(props.min, props.modelValue + by))
}

function onInput(event) {
	const next = Number(event.target.value)
	// A half-typed number is not a reason to reset the line to zero, so a
	// non-numeric intermediate state is simply ignored.
	if (!Number.isFinite(next)) return
	emit("update:modelValue", Math.max(props.min, next))
}
</script>
