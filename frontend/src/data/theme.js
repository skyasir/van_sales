/**
 * Light, dark, or follow the phone.
 *
 * The whole app is drawn with Frappe UI's semantic tokens -- `surface-*`,
 * `ink-*`, `outline-*` -- so switching this flips every screen at once. That
 * is the payoff for not carrying a private palette: there is no second set of
 * colours to keep in step, and nothing to fix up per screen.
 *
 * A van cab in daylight and a chiller at 5am are genuinely different rooms,
 * so the choice is offered rather than guessed, and it is remembered on the
 * handset between sessions.
 */

import { ref } from "vue"

const KEY = "theme"
const THEMES = ["light", "dark", "system"]

export const theme = ref("system")

function systemTheme() {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function setTheme(next) {
	if (!THEMES.includes(next)) return
	theme.value = next
	document.documentElement.setAttribute("data-theme", next === "system" ? systemTheme() : next)
	localStorage.setItem(KEY, next)
}

/**
 * Applied before the first paint, so the app never flashes light and then
 * snaps to dark in a rep's eyes at the start of a night shift.
 */
export function initTheme() {
	const stored = localStorage.getItem(KEY)
	setTheme(THEMES.includes(stored) ? stored : "system")

	// Following the phone means following it as it changes, not just at boot.
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		if (theme.value === "system") setTheme("system")
	})
}
