<template>
	<!--
		Placeholder for a screen whose backend is not built yet.

		It names what the screen will do rather than showing a fake one, so a
		demo never implies working functionality that is not there.
	-->
	<div>
		<PageHeader :title="copy.title" :subtitle="copy.subtitle" />

		<ScreenBody>
			<div class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5">
				<div class="flex items-center gap-2">
					<FeatherIcon name="tool" class="h-[18px] w-[18px] text-ink-amber-3" />
					<span
						class="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-amber-3"
					>
						Not built yet
					</span>
				</div>
				<p class="mt-2 text-sm leading-[21px] text-ink-gray-8">{{ copy.summary }}</p>
			</div>

			<div class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5">
				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
					What this screen will do
				</p>
				<ul class="mt-2 flex flex-col gap-2">
					<li v-for="(bullet, i) in copy.bullets" :key="i" class="flex gap-2.5">
						<span
							class="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink-gray-4"
						/>
						<span class="flex-1 text-[13.5px] leading-5 text-ink-gray-6">{{
							bullet
						}}</span>
					</li>
				</ul>
			</div>
		</ScreenBody>
	</div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"
import { computed } from "vue"

import PageHeader from "../components/PageHeader.vue"
import ScreenBody from "../components/ScreenBody.vue"

const props = defineProps({
	screen: { type: String, required: true },
})

const SCREENS = {
	collect: {
		title: "Collections",
		subtitle: "Draft payment entries",
		summary:
			"What the driver has collected today, all of it still draft until the cashier finalises.",
		bullets: [
			"Record cash and cheque against a customer",
			"Allocate oldest invoice first, or leave on account",
			"Running total that matches what the cashier will count",
		],
	},
	presales_home: {
		title: "My day",
		subtitle: "Allocated customers",
		summary:
			"The rep’s allocated customers for the day, each showing what they already owe before the visit starts.",
		bullets: [
			"List allocated customers from the Sales Team allocation, ordered by visit due date",
			"Show outstanding and days overdue on every row",
			"Open straight into a new sales order or a collection",
		],
	},
	order: {
		title: "New sales order",
		subtitle: "Draft → approval",
		summary:
			"Order taking at the customer, priced from the customer’s price list and soft-reserved for the team leader to approve.",
		bullets: [
			"Scan or search items and set quantities",
			"Server-priced totals, same quote endpoint the van uses",
			"Submits as a draft Sales Order pending Team Leader approval",
		],
	},
	orders: {
		title: "My orders",
		subtitle: "Pipeline",
		summary:
			"The rep’s own orders tracked through approval, picking and delivery instead of chasing the back office.",
		bullets: [
			"Sales Orders owned by this user with workflow state",
			"Filter by pending, approved, picking, delivered",
			"Drill into the order and its delivery status",
		],
	},
	approvals: {
		title: "Approvals",
		subtitle: "Team queue",
		summary:
			"Orders waiting on this team leader, sorted by what is wrong with them rather than by time received.",
		bullets: [
			"Queue of team Sales Orders in Pending Approval",
			"Flag low margin, over credit limit and price overrides first",
			"Approve, reject with a reason, or edit quantity and rate in place",
		],
	},
	team: {
		title: "My team",
		subtitle: "Sales persons",
		summary:
			"Team performance built from the Sales Person tree, so the subtree defines the team with no second hierarchy to maintain.",
		bullets: [
			"Each rep’s orders, value and collection totals",
			"Drill from a rep into their orders and customers",
			"Compare against target from Target Detail",
		],
	},
	trip: {
		title: "My trip",
		subtitle: "Delivery Trip",
		summary:
			"The driver’s sequenced trip for today, taken from the Delivery Trip the back office planned.",
		bullets: [
			"Stops in planned sequence with window and address",
			"Progress and cash collected so far",
			"Open a stop to scan out and confirm delivery",
		],
	},
	deliveries: {
		title: "Delivery",
		subtitle: "Scan to confirm",
		summary:
			"Line-level scan confirmation at the door, so a shortfall surfaces there rather than at day close.",
		bullets: [
			"Scan each line against the Delivery Note",
			"Mark delivered only when every line is confirmed",
			"Record a partial delivery or a not-home outcome",
		],
	},
	picking: {
		title: "Picking",
		subtitle: "Pick List",
		summary:
			"Bin-sequenced, FEFO-ordered picking against the Pick List the sales orders generated.",
		bullets: [
			"Walk order follows bin sequence, batches follow earliest expiry",
			"Scan each carton to confirm the pick",
			"Raise a shortage to the purchaser without leaving the screen",
		],
	},
	loading: {
		title: "Van loading",
		subtitle: "Reverse route order",
		summary:
			"Staging and loading the van in reverse stop order, so the driver unloads front-first at every stop.",
		bullets: [
			"Stops listed last-to-first for loading",
			"Confirm each stop’s cartons onto the van",
			"Handover to the driver with a seal number",
		],
	},
	shortages: {
		title: "Shortages",
		subtitle: "Purchaser notified",
		summary: "What could not be picked, and the choice of how to resolve it.",
		bullets: [
			"Substitute, part-deliver and backorder, or post a flagged negative",
			"Notify the purchaser through a Material Request",
			"Negative positions carry the clearing clock from Van Sales Settings",
		],
	},
	requests: {
		title: "Requests",
		subtitle: "Material Requests",
		summary: "Replenishment requests raised by vans, queued into tomorrow’s pick wave.",
		bullets: [
			"Van par levels drive the requested quantity",
			"Approve or adjust before it reaches the wave",
			"Track from request through transfer to van receipt",
		],
	},
	dashboard: {
		title: "Dashboard",
		subtitle: "Live",
		summary:
			"Management figures read live from the same ledgers the accounts team closes on, with no nightly rollup.",
		bullets: [
			"Sales, gross margin, receivables and stock value",
			"Van and driver performance for the day",
			"Drill from any tile into the documents behind it",
		],
	},
	sales: {
		title: "Sales",
		subtitle: "Trends",
		summary: "Sales trend and mix, by route, rep and item.",
		bullets: [
			"Daily, weekly and monthly comparison",
			"Top items and top customers",
			"Margin by route and by rep",
		],
	},
	alerts: {
		title: "Alerts",
		subtitle: "Exceptions",
		summary:
			"Exceptions that need a decision, each with a clock rather than an open-ended list.",
		bullets: [
			"Negative stock positions past the clearing window",
			"Customers over credit limit and blocked transactions",
			"Orders stuck in approval or picking",
		],
	},
	reports: {
		title: "Reports",
		subtitle: "Operational",
		summary: "Daily reconciliation across vehicle loads, deliveries, collections and returns.",
		bullets: [
			"Vehicle-wise and driver-wise daily reconciliation",
			"Collection summaries, cash versus credit",
			"Export or share as PDF",
		],
	},
}

const copy = computed(
	() =>
		SCREENS[props.screen] ?? {
			title: "Not built yet",
			subtitle: "",
			summary: "This screen has no backend yet.",
			bullets: [],
		},
)
</script>
