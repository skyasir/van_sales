<template>
	<!--
		The bottom bar. Its tabs are never hardcoded per build:
		`bootstrap.tabs[persona]` is what renders, so adding a role on the desk
		changes the app.

		A handset tab bar is the one piece of chrome Frappe UI has no component
		for -- it is a desktop-first library -- so this is built from the
		design system's tokens rather than from a palette of its own.
	-->
	<nav
		v-if="tabs.length"
		class="safe-bottom flex border-t border-outline-gray-2 bg-surface-white px-1.5 pt-2"
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
				class="h-5 w-5"
				:class="isActive(tab.route) ? 'text-ink-gray-9' : 'text-ink-gray-4'"
			/>
			<span
				class="text-xs"
				:class="
					isActive(tab.route)
						? 'font-semibold text-ink-gray-9'
						: 'font-medium text-ink-gray-4'
				"
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
