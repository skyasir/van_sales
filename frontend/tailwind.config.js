/**
 * The Frappe UI design system, unmodified.
 *
 * No colour palette is defined here on purpose. Surfaces, ink and outlines
 * all come from the preset's semantic tokens (`surface-*`, `ink-*`,
 * `outline-*`), so this app looks like a Frappe app and follows the light
 * and dark themes without a second set of colours to keep in step.
 *
 * The only additions are two things the field genuinely needs and the
 * preset has no opinion on: a 48px minimum touch target, because the people
 * using this wear gloves in a chiller, and tabular figures for money, so
 * digits line up column-wise and misreading 1,240 as 12,40 is harder.
 */
import frappeUIPreset from "frappe-ui/tailwind"

export default {
	presets: [frappeUIPreset],
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
		"./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
		"./node_modules/frappe-ui/src/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			spacing: {
				touch: "48px",
			},
		},
	},
	plugins: [],
}
