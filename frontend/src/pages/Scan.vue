<template>
	<!--
		Barcode scanning.

		One scan has to resolve the item, its UOM, the price for this customer
		and what is on the van -- so the rep never types. Two details matter:

		- The same barcode is debounced. A laser scanner fires the same code
		  many times a second, and without the guard a single trigger pull adds
		  five cartons.
		- A hit that is not on the van is shown, not hidden. The rep may still
		  sell it if the van count is wrong, but they are told first.
	-->
	<div class="flex min-h-full flex-col bg-surface-gray-1">
		<PageHeader title="Scan" :subtitle="cart.customer?.customer_name ?? ''" back />

		<!-- No BarcodeDetector means no scanning, and pretending otherwise
		     would leave the rep pointing a camera at a label forever. -->
		<div v-if="!supported" class="flex flex-1 flex-col items-center justify-center gap-3 p-6">
			<FeatherIcon name="camera-off" class="h-10 w-10 text-ink-gray-4" />
			<p class="text-center text-lg font-semibold text-ink-gray-9">
				This browser cannot scan barcodes
			</p>
			<p class="text-center text-[13px] leading-5 text-ink-gray-6">
				Barcode detection is not available here. Every line has to be searched instead.
			</p>
			<Button
				class="mt-2 w-full"
				variant="solid"
				theme="blue"
				@click="router.replace({ name: 'items' })"
			>
				Search for the item instead
			</Button>
		</div>

		<div v-else-if="denied" class="flex flex-1 flex-col items-center justify-center gap-3 p-6">
			<FeatherIcon name="camera-off" class="h-10 w-10 text-ink-gray-4" />
			<p class="text-center text-lg font-semibold text-ink-gray-9">
				Camera access is needed to scan
			</p>
			<p class="text-center text-[13px] leading-5 text-ink-gray-6">
				Scanning is how items reach an invoice. Without the camera every line has to be
				typed.
			</p>
			<Button class="mt-2 w-full" variant="solid" theme="blue" @click="start"
				>Allow camera</Button
			>
			<!-- Never a dead end. A refused camera must not stop the sale, so
			     the typed path is offered right here rather than left to be
			     found. -->
			<Button class="w-full" variant="outline" @click="router.replace({ name: 'items' })">
				Search for the item instead
			</Button>
		</div>

		<div v-else class="relative flex-1 bg-black">
			<video ref="video" class="h-full w-full object-cover" muted playsinline />

			<!-- A window to aim through. Without it reps hold the phone too far
			     back and every read fails. -->
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div class="h-40 w-[78%] rounded-2xl border-2 border-white/80 shadow-lg" />
			</div>

			<div
				v-if="busy"
				class="absolute left-1/2 top-6 -translate-x-1/2 rounded-full bg-surface-gray-7 px-3 py-1.5"
			>
				<LoadingIndicator class="h-4 w-4 text-ink-white" />
			</div>

			<div class="safe-bottom absolute inset-x-0 bottom-0 p-3.5">
				<div
					v-if="hit"
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
				>
					<p class="text-[15px] font-semibold text-ink-gray-8">{{ hit.item_name }}</p>
					<p class="money mt-1 text-[11.5px] font-medium text-ink-gray-5">
						{{ hit.item_code }} · {{ hit.uom }}
					</p>
					<StockTag class="mt-2" :van-qty="hit.van_qty" :uom="hit.uom" />

					<div class="mt-3 flex items-center justify-between">
						<span class="money text-xl font-semibold text-ink-gray-8">{{
							money(hit.rate)
						}}</span>
						<Button variant="solid" theme="blue" @click="addToInvoice"
							>Add to invoice</Button
						>
					</div>
				</div>

				<div
					v-else-if="miss"
					class="rounded-lg border border-outline-amber-2 bg-surface-amber-1 p-3.5"
				>
					<p class="text-[13.5px] font-bold text-ink-amber-3">Not recognised</p>
					<p class="money mt-1 text-[12.5px] text-ink-amber-3">{{ miss }}</p>
					<Button
						class="mt-2"
						variant="subtle"
						@click="router.replace({ name: 'items' })"
					>
						Search instead
					</Button>
				</div>

				<p v-else class="text-center text-[13px] text-ink-gray-6">
					Point the camera at a barcode
				</p>
			</div>
		</div>
	</div>
</template>

<script setup>
import { Button, FeatherIcon, LoadingIndicator } from "frappe-ui"
import { onBeforeUnmount, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

import PageHeader from "../components/PageHeader.vue"
import StockTag from "../components/StockTag.vue"
import { api } from "../data/api"
import { addItem, cart } from "../data/cart"
import { money } from "../data/format"
import { ApiError } from "../data/request"
import { session } from "../data/session"

/** A scanner repeats the same code many times a second. */
const SAME_CODE_COOLDOWN_MS = 1800

const router = useRouter()

const video = ref(null)
const supported = ref("BarcodeDetector" in window)
const denied = ref(false)
const busy = ref(false)
const hit = ref(null)
const miss = ref(null)

let stream = null
let detector = null
let raf = null
let lastCode = null

async function start() {
	denied.value = false
	try {
		stream = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: "environment" },
		})
		if (!video.value) return
		video.value.srcObject = stream
		await video.value.play()

		detector = new window.BarcodeDetector({
			formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"],
		})
		loop()
	} catch {
		denied.value = true
	}
}

function loop() {
	raf = requestAnimationFrame(async () => {
		if (!detector || !video.value || video.value.readyState !== 4) return loop()
		try {
			const codes = await detector.detect(video.value)
			if (codes.length) onScanned(codes[0].rawValue)
		} catch {
			/* a dropped frame is not worth surfacing */
		}
		loop()
	})
}

async function onScanned(raw) {
	const code = String(raw ?? "").trim()
	if (!code || busy.value) return

	const now = Date.now()
	if (lastCode?.code === code && now - lastCode.at < SAME_CODE_COOLDOWN_MS) return
	lastCode = { code, at: now }

	busy.value = true
	miss.value = null

	try {
		const result = await api.resolveBarcode({
			barcode: code,
			warehouse: session.van?.warehouse,
			customer: cart.customer?.name,
			price_list: session.van?.price_list,
			company: session.van?.company,
			currency: session.van?.currency,
		})

		if (result.found && result.item) {
			buzz(30)
			hit.value = result.item
		} else {
			buzz([40, 60, 40])
			hit.value = null
			miss.value = code
		}
	} catch (e) {
		hit.value = null
		miss.value = e instanceof ApiError ? e.message : "Lookup failed."
	} finally {
		busy.value = false
	}
}

// A read has to be felt, not read: the rep is looking at the shelf, not the
// screen. Vibration is absent on iOS Safari, which costs nothing here.
function buzz(pattern) {
	navigator.vibrate?.(pattern)
}

function addToInvoice() {
	if (!hit.value) return
	addItem(hit.value, 1)
	hit.value = null
	lastCode = null
	router.push({ name: "invoice" })
}

function stop() {
	cancelAnimationFrame(raf)
	stream?.getTracks().forEach((track) => track.stop())
	stream = null
}

onMounted(() => {
	if (supported.value) start()
})

onBeforeUnmount(stop)
</script>
