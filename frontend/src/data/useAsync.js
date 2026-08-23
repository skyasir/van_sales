/**
 * Minimal data-fetching composable: enough for this app, nothing more.
 *
 * frappe-ui's `createResource` covers the same ground, but it assumes the
 * standard fetcher. This app's transport carries the unwrapped Frappe error
 * message and the offline flag that every retry affordance keys off, so the
 * screens load through here instead.
 */

import { isRef, ref, unref, watch } from "vue"

import { ApiError } from "./request"

export function useAsync(fn, sources = [], { immediate = true } = {}) {
	const data = ref(null)
	const error = ref(null)
	const loading = ref(immediate)
	/** True when the failure was transport-level, so a retry is worth offering. */
	const offline = ref(false)

	// Guards against a slow response landing after the screen has moved on.
	let token = 0

	async function reload() {
		const mine = ++token
		loading.value = true
		error.value = null
		try {
			const result = await fn()
			if (mine !== token) return
			data.value = result
			offline.value = false
		} catch (e) {
			if (mine !== token) return
			data.value = null
			offline.value = e instanceof ApiError && e.offline
			error.value = e instanceof Error ? e.message : "Something went wrong."
		} finally {
			if (mine === token) loading.value = false
		}
	}

	if (sources.length) {
		watch(
			sources.map((s) => (isRef(s) || typeof s === "function" ? s : () => unref(s))),
			reload,
			{ immediate },
		)
	} else if (immediate) {
		reload()
	}

	return { data, error, loading, offline, reload }
}
