/**
 * Talking to Frappe.
 *
 * Ported wholesale from the React Native build, because the two things it
 * got right are not things frappe-ui's default fetcher does for us.
 *
 * First, errors. Frappe puts the message a human should read inside
 * `_server_messages` -- a JSON string containing an array of JSON strings.
 * If we do not unwrap that, every validation failure reaches the rep as
 * "Internal Server Error" and they have no idea the credit limit stopped
 * them.
 *
 * Second, telling "no signal" apart from "the server said no". A van drives
 * through basements all day; a request that never left the handset must be
 * retried, while a 417 from a validation rule must not be. `ApiError.offline`
 * is what the retry affordances key off.
 *
 * Two transports, one call signature. Served from the bench as a PWA the app
 * is same-origin and rides the ordinary session cookie plus CSRF token. Built
 * as a Capacitor shell it runs on a `capacitor://` origin where that cookie
 * cannot follow, so it falls back to the API key pair issued by
 * `van_sales.api.auth.login` and an absolute base URL.
 */

const TIMEOUT_MS = 20_000

export class ApiError extends Error {
	constructor(message, { status = 0, offline = false, exception = "" } = {}) {
		super(message)
		this.name = "ApiError"
		this.status = status
		/** True when the request never reached the server. Safe to retry. */
		this.offline = offline
		this.exception = exception
	}
}

/** Frappe messages are HTML fragments; a phone wants plain text. */
function stripHtml(text) {
	return String(text)
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.trim()
}

/** Pull the readable message out of a Frappe error body. */
function frappeMessage(body, fallback) {
	const serverMessages = body?._server_messages
	if (typeof serverMessages === "string") {
		try {
			const messages = JSON.parse(serverMessages)
				.map((entry) => {
					try {
						return JSON.parse(entry)?.message ?? entry
					} catch {
						return entry
					}
				})
				.filter(Boolean)
			if (messages.length) return stripHtml(messages.join("\n"))
		} catch {
			/* fall through to the other shapes below */
		}
	}

	if (typeof body?.message === "string" && body.message) return stripHtml(body.message)
	if (typeof body?.exc_type === "string" && body.exc_type) return body.exc_type
	return fallback
}

/**
 * A bench on someone's laptop is reached over the LAN by IP and speaks
 * plain http; a real deployment is a hostname and speaks https. Guessing
 * https for a LAN address means the app fails to connect on the first try
 * of every dev setup, so private addresses default to http.
 */
function isLocalAddress(host) {
	const bare = host.replace(/:\d+$/, "").toLowerCase()

	if (bare === "localhost" || bare.endsWith(".localhost")) return true
	if (bare.endsWith(".local")) return true

	const octets = bare.split(".")
	if (octets.length !== 4 || !octets.every((o) => /^\d{1,3}$/.test(o))) return false

	const [a, b] = octets.map(Number)
	if (a === 127 || a === 10) return true
	if (a === 192 && b === 168) return true
	if (a === 172 && b >= 16 && b <= 31) return true
	if (a === 169 && b === 254) return true
	return false
}

export function normaliseSite(raw) {
	const trimmed = String(raw || "")
		.trim()
		.replace(/\/+$/, "")
	if (!trimmed) return ""
	if (/^https?:\/\//i.test(trimmed)) return trimmed
	return `${isLocalAddress(trimmed) ? "http" : "https"}://${trimmed}`
}

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

const KEY_TOKEN = "van_sales_token"

/** True when the page was served by the bench itself. */
export function isSameOrigin() {
	return typeof window !== "undefined" && /^https?:$/.test(window.location.protocol)
}

export function storedToken() {
	try {
		const raw = localStorage.getItem(KEY_TOKEN)
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

export function storeToken(token) {
	if (token) localStorage.setItem(KEY_TOKEN, JSON.stringify(token))
	else localStorage.removeItem(KEY_TOKEN)
}

/** Where requests go: the serving origin, or the site the rep signed into. */
export function baseUrl() {
	const token = storedToken()
	if (token?.site) return token.site
	return isSameOrigin() ? "" : ""
}

/**
 * Call a whitelisted method and return its `message` payload.
 *
 * This is also what frappe-ui's resources are pointed at, so a component can
 * use `createResource` and still get the unwrapped Frappe error message and
 * the offline flag.
 */
export async function request(dottedPath, { method = "GET", args = {}, signal } = {}) {
	const token = storedToken()
	const base = baseUrl()

	let url = `${base}/api/method/${dottedPath}`
	const headers = {
		Accept: "application/json",
		"X-Requested-With": "XMLHttpRequest",
	}

	if (token?.apiKey) {
		headers.Authorization = `token ${token.apiKey}:${token.apiSecret}`
	} else if (window.csrf_token && window.csrf_token !== "{{ csrf_token }}") {
		headers["X-Frappe-CSRF-Token"] = window.csrf_token
	}

	let body
	if (method === "GET") {
		const query = new URLSearchParams()
		for (const [key, value] of Object.entries(args)) {
			if (value === undefined || value === null) continue
			query.append(key, typeof value === "object" ? JSON.stringify(value) : String(value))
		}
		const qs = query.toString()
		if (qs) url += `?${qs}`
	} else {
		headers["Content-Type"] = "application/json"
		body = JSON.stringify(args)
	}

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
	if (signal) signal.addEventListener("abort", () => controller.abort())

	let response
	try {
		response = await fetch(url, {
			method,
			headers,
			body,
			signal: controller.signal,
			// Only meaningful same-origin; harmless under a token.
			credentials: token?.apiKey ? "omit" : "include",
		})
	} catch (error) {
		// fetch only rejects on transport failure, so this is genuinely "did
		// not arrive" -- never a rejection the server chose to send.
		const aborted = error?.name === "AbortError"
		throw new ApiError(
			aborted ? "The server took too long to answer." : "No connection to the server.",
			{ offline: true },
		)
	} finally {
		clearTimeout(timer)
	}

	const text = await response.text()
	let payload = null
	try {
		payload = text ? JSON.parse(text) : null
	} catch {
		payload = null
	}

	if (!response.ok) {
		const status = response.status
		throw new ApiError(
			frappeMessage(
				payload,
				status === 401 || status === 403
					? "Your session is no longer valid."
					: `Request failed (${status}).`,
			),
			{ status, exception: payload?.exc_type },
		)
	}

	return payload?.message ?? payload
}

/** Exchange credentials for an API key pair (the Capacitor / remote path). */
export async function tokenLogin(site, usr, pwd) {
	const normalised = normaliseSite(site)
	if (!normalised) throw new ApiError("Enter the site address first.")

	const response = await fetch(`${normalised}/api/method/van_sales.api.auth.login`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		body: JSON.stringify({ usr: usr.trim(), pwd, device_name: "Van Sales app" }),
	}).catch(() => {
		throw new ApiError("No connection to the server.", { offline: true })
	})

	const payload = await response.json().catch(() => null)
	if (!response.ok) {
		throw new ApiError(frappeMessage(payload, "Could not sign in."), {
			status: response.status,
		})
	}

	const result = payload?.message ?? payload
	return {
		site: normalised,
		apiKey: result.api_key,
		apiSecret: result.api_secret,
		bootstrap: result.bootstrap,
	}
}

/** Ordinary same-origin sign-in, riding the Frappe session cookie. */
export async function sessionLogin(usr, pwd) {
	const response = await fetch("/api/method/login", {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json" },
		credentials: "include",
		body: JSON.stringify({ usr: usr.trim(), pwd }),
	}).catch(() => {
		throw new ApiError("No connection to the server.", { offline: true })
	})

	const payload = await response.json().catch(() => null)
	if (!response.ok) {
		throw new ApiError(frappeMessage(payload, "Invalid login credentials."), {
			status: response.status,
		})
	}
	return payload
}

export async function sessionLogout() {
	await fetch("/api/method/logout", { method: "POST", credentials: "include" }).catch(() => {})
}
