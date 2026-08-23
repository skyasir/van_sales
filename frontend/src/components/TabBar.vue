<template>
	<nav
		v-if="tabs.length"
		class="safe-bottom flex border-t border-van-border bg-van-card px-1.5 pt-2"
		role="tablist"
	>
		<button
			v-for="tab in tabs"
			:key="tab.route"
			type="button"
			role="tab"
			:aria-selected="isActive(tab.route)"
			:aria-label="tab.label"
			class="flex min-h-touch flex-1 flex-col items-center gap-1 pb-1.5 pt-1"
			@click="go(tab.route)"
		>
			<FeatherIcon
				:name="icon(tab.icon)"
				class="h-[21px] w-[21px]"
				:class="isActive(tab.route) ? 'text-brand' : 'text-van-placeholder'"
			/>
			<span
				class="text-[10.5px] font-bold"
				:class="isActive(tab.route) ? 'text-brand' : 'text-van-placeholder'"
			>
				{{ tab.label }}
			</span>
		</button>
	</nav>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"
import { useRoute, useRouter } from "vue-router"

import { tabs } from "../data/session"

const route = useRoute()
const router = useRouter()

/** Server icon names -> the set frappe-ui actually bundles. */
const ICONS = {
	route: "map",
	scan: "camera",
	customers: "users",
	stock: "package",
	plus: "plus-circle",
	orders: "file-text",
	approvals: "check-circle",
	team: "users",
	cash: "dollar-sign",
	alert: "alert-triangle",
	dashboard: "grid",
	chart: "bar-chart-2",
	person: "user",
}

function icon(name) {
	return ICONS[name] ?? "circle"
}

function isActive(target) {
	return route.name === target
}

function go(target) {
	if (isActive(target)) return
	// Tabs replace rather than push, so the back gesture never walks a rep
	// backwards through every tab they happened to touch.
	router.replace({ name: target })
}
</script>
