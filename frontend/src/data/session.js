/**
 * Session state for the whole app.
 *
 * Policy comes down with the bootstrap, so the app re-fetches it whenever it
 * returns to the foreground. Without that, a setting changed on the desk --
 * turning barcode scanning off, say -- would not reach a handset until the
 * next sign-in, which for a rep who stays signed in all week is effectively
 * never.
 *
 * The last bootstrap is cached in localStorage because it is not secret and
 * because the app has to open on a van with no signal. That is the point of
 * `policy.offline_window_hours`: the rep keeps working from the cached
 * session for as long as the server said is acceptable, and is pushed back
 * to a real sign-in once that runs out.
 */

import { computed, reactive, readonly } from "vue"

import {
	ApiError,
	isSameOrigin,
	sessionLogin,
	sessionLogout,
	storeToken,
	storedToken,
	tokenLogin,
} from "./request"
import { api } from "./api"
import { requestLocationAccess } from "./geo"

const KEY_BOOTSTRAP = "van_sales_bootstrap"
const KEY_LAST_SITE = "van_sales_last_site"
const KEY_LAST_USER = "van_sales_last_user"
const KEY_SIGNED_IN_AT = "van_sales_signed_in_at"
const KEY_ACTIVE_VAN = "van_sales_active_van"

const state = reactive({
	ready: false,
	signedIn: false,
	bootstrap: null,
	persona: null,
	van: null,
	lastSite: localStorage.getItem(KEY_LAST_SITE) || "",
	lastUser: localStorage.getItem(KEY_LAST_USER) || "",
	/** Set when the cached session has outlived the server's offline window. */
	staleSession: false,
})

function readJson(key) {
	try {
		const raw = localStorage.getItem(key)
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

function applyBootstrap(next, preferredVan) {
	state.bootstrap = next
	state.persona =
		state.persona && next.personas.includes(state.persona) ? state.persona : next.active_persona

	const wanted = preferredVan ?? state.van?.profile ?? localStorage.getItem(KEY_ACTIVE_VAN)
	state.van = next.vans.find((v) => v.profile === wanted) ?? next.vans[0] ?? null
}

/**
 * Restore whatever the last session left behind, before the first render
 * decides between the login screen and the route screen.
 */
export async function restore() {
	const cached = readJson(KEY_BOOTSTRAP)
	const token = storedToken()
	const signedAt = Number(localStorage.getItem(KEY_SIGNED_IN_AT) || 0)

	// Served from the bench, the session cookie is the source of truth and a
	// cached bootstrap only avoids a blank first paint. On a Capacitor build
	// there is no cookie, so the stored key pair is what "signed in" means.
	const hasCredential = isSameOrigin() ? Boolean(cached) : Boolean(token?.apiKey)

	if (hasCredential && cached) {
		const windowHours = cached?.policy?.offline_window_hours ?? 72
		const expired = signedAt > 0 && Date.now() - signedAt > windowHours * 60 * 60 * 1000

		if (expired) {
			// Keep the keys -- the rep may come back into coverage and a fresh
			// sign-in will simply reuse them -- but make the app ask.
			state.staleSession = true
		} else {
			state.signedIn = true
			applyBootstrap(cached)
		}
	}

	if (state.signedIn) {
		// Confirm against the server, but never let a dead network undo a
		// session the offline window says is still good.
		try {
			await refresh()
		} catch (error) {
			if (!(error instanceof ApiError) || !error.offline) {
				if (error?.status === 401 || error?.status === 403) await signOut()
			}
		}
		requestLocationAccess()
	}

	state.ready = true
}

export async function signIn({ site, usr, pwd }) {
	let bootstrap = null

	if (isSameOrigin() && !site) {
		await sessionLogin(usr, pwd)
		bootstrap = await api.bootstrap()
	} else {
		const result = await tokenLogin(site, usr, pwd)
		storeToken({ site: result.site, apiKey: result.apiKey, apiSecret: result.apiSecret })
		bootstrap = result.bootstrap
		localStorage.setItem(KEY_LAST_SITE, result.site)
		state.lastSite = result.site
	}

	localStorage.setItem(KEY_BOOTSTRAP, JSON.stringify(bootstrap))
	localStorage.setItem(KEY_LAST_USER, usr.trim())
	localStorage.setItem(KEY_SIGNED_IN_AT, String(Date.now()))

	state.lastUser = usr.trim()
	state.staleSession = false
	state.signedIn = true
	applyBootstrap(bootstrap)

	requestLocationAccess()
}

export async function signOut() {
	if (isSameOrigin() && !storedToken()) await sessionLogout()
	storeToken(null)
	localStorage.removeItem(KEY_BOOTSTRAP)
	localStorage.removeItem(KEY_SIGNED_IN_AT)
	localStorage.removeItem(KEY_ACTIVE_VAN)

	state.signedIn = false
	state.bootstrap = null
	state.persona = null
	state.van = null
	state.staleSession = false
}

export async function refresh() {
	const next = await api.bootstrap()
	localStorage.setItem(KEY_BOOTSTRAP, JSON.stringify(next))
	localStorage.setItem(KEY_SIGNED_IN_AT, String(Date.now()))
	applyBootstrap(next, state.van?.profile)
	return next
}

export function setPersona(persona) {
	if (state.bootstrap?.personas.includes(persona)) state.persona = persona
}

export function setVan(van) {
	state.van = van
	localStorage.setItem(KEY_ACTIVE_VAN, van.profile)
}

/**
 * Re-fetch policy and roles when the app comes back to the foreground.
 * Throttled, because browsers fire visibilitychange on trivial things, and
 * this must fail quietly: a refresh that cannot reach the server just leaves
 * the cache in place.
 */
const MIN_REFRESH_GAP_MS = 20_000
let lastRefreshAt = 0

export function watchForeground() {
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible") return
		if (!state.signedIn) return
		const now = Date.now()
		if (now - lastRefreshAt < MIN_REFRESH_GAP_MS) return
		lastRefreshAt = now
		refresh().catch(() => {})
	})
}

export const session = readonly(state)

/** Tabs for the active persona, straight from the server. */
export const tabs = computed(() =>
	state.persona ? (state.bootstrap?.tabs?.[state.persona] ?? []) : [],
)

export const policy = computed(() => state.bootstrap?.policy ?? {})
export const defaults = computed(() => state.bootstrap?.defaults ?? {})
export const currency = computed(
	() => state.van?.currency || state.bootstrap?.defaults?.currency || "",
)
export const company = computed(
	() => state.van?.company || state.bootstrap?.defaults?.company || null,
)
