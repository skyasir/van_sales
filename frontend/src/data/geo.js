/**
 * The two things every posted document carries: an idempotency key and,
 * where policy asks for it, where the device was standing.
 */

/**
 * Generated once per document, before it is posted -- never per attempt.
 * If a retry generated a fresh key the server would have no way to tell the
 * retry from a genuine second sale, which is the whole failure this guards.
 */
export function newClientUid() {
	if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
	// Older WebViews: good enough for an idempotency key, which only has to
	// be unique per device per document.
	return "uid-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10)
}

let warmFix = null

/**
 * Ask for location access. Call this at a calm moment -- opening the app --
 * never in the middle of posting a document.
 *
 * Warming a fix here is the point: it caches a position so a later post can
 * read one without the browser raising its permission prompt on top of a
 * customer waiting to pay.
 */
export function requestLocationAccess() {
	return new Promise((resolve) => {
		if (!navigator.geolocation) return resolve(false)
		navigator.geolocation.getCurrentPosition(
			(position) => {
				warmFix = { position, at: Date.now() }
				resolve(true)
			},
			() => resolve(false),
			{ enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60 * 1000 },
		)
	})
}

/**
 * Where the device was, as far as the browser already knows.
 *
 * Reads the warm fix first and never waits long for a live one. Requesting a
 * fresh position during a post put a permission prompt on top of a rep
 * mid-sale, with the document unposted behind them. A coordinate on the
 * invoice is useful; it is not worth stalling the sale for, so if no
 * position is available the document posts without one.
 */
export function captureGeo(enabled) {
	if (!enabled) return Promise.resolve(null)

	const MAX_AGE_MS = 15 * 60 * 1000
	if (warmFix && Date.now() - warmFix.at < MAX_AGE_MS) {
		return Promise.resolve(toGeo(warmFix.position))
	}

	return new Promise((resolve) => {
		if (!navigator.geolocation) return resolve(null)
		navigator.geolocation.getCurrentPosition(
			(position) => {
				warmFix = { position, at: Date.now() }
				resolve(toGeo(position))
			},
			() => resolve(null),
			{ enableHighAccuracy: false, timeout: 3_000, maximumAge: MAX_AGE_MS },
		)
	})
}

function toGeo(position) {
	return {
		latitude: position.coords.latitude,
		longitude: position.coords.longitude,
		accuracy: position.coords.accuracy ?? null,
	}
}

/** ISO timestamp in the shape Frappe's Datetime field accepts. */
export function capturedAt() {
	const d = new Date()
	const pad = (n) => String(n).padStart(2, "0")
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
		`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
	)
}
