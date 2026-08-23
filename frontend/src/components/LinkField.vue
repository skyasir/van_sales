<template>
	<!--
		A field that holds a link to another document.

		Reads like a form field rather than a button, because that is what it
		is: a labelled slot showing either the chosen document or a prompt,
		which opens a picker when tapped. Anyone who has filled in a Sales
		Invoice on the desk knows this shape immediately.
	-->
	<div class="flex flex-col gap-1.5">
		<span class="section-label">
			{{ label }}
			<span v-if="required" class="text-bad">*</span>
		</span>

		<button
			type="button"
			:disabled="disabled"
			:aria-label="`${label}: ${value || placeholder}`"
			class="flex min-h-[52px] items-center gap-2 rounded-xl border px-3.5 py-2 text-left active:opacity-80"
			:class="[
				filled ? 'border-van-border-strong' : 'border-van-border',
				disabled ? 'bg-van-subtle' : 'bg-van-card',
			]"
			@click="$emit('open')"
		>
			<span class="min-w-0 flex-1">
				<span
					class="block truncate text-[15.5px] font-medium"
					:class="filled ? 'text-van-text' : 'text-van-placeholder'"
				>
					{{ value || placeholder }}
				</span>
				<span
					v-if="description && filled"
					class="mt-0.5 block truncate text-xs text-van-muted"
				>
					{{ description }}
				</span>
			</span>

			<FeatherIcon
				v-if="filled && clearable && !disabled"
				name="x-circle"
				class="h-5 w-5 shrink-0 text-van-placeholder"
				role="button"
				:aria-label="`Clear ${label}`"
				@click.stop="$emit('clear')"
			/>
			<FeatherIcon v-else name="chevron-down" class="h-4 w-4 shrink-0 text-van-placeholder" />
		</button>
	</div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"
import { computed } from "vue"

const props = defineProps({
	label: { type: String, required: true },
	value: { type: String, default: "" },
	description: { type: String, default: "" },
	placeholder: { type: String, default: "Select" },
	required: { type: Boolean, default: false },
	disabled: { type: Boolean, default: false },
	clearable: { type: Boolean, default: false },
})

defineEmits(["open", "clear"])

const filled = computed(() => Boolean(props.value))
</script>
