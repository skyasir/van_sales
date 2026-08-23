/**
 * The van sales palette, carried over from the React Native build so the
 * app looks like itself and not like a generic Frappe screen.
 *
 * Two rules survive from that build and are encoded here. Touch targets are
 * never smaller than 48px, because the people using this wear gloves in a
 * chiller -- that is the `touch` spacing token. And every figure that
 * represents money is set in a monospace face, so digits line up column-wise
 * and misreading 1,240 as 12,40 is much harder -- that is `font-mono`.
 */
import frappeUIPreset from "frappe-ui/tailwind"

export default {
	presets: [frappeUIPreset],
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
		"./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				van: {
					bg: "#F5F7FA",
					card: "#FFFFFF",
					border: "#E8EBF1",
					"border-strong": "#DCE1E9",
					subtle: "#EFF2F7",
					text: "#101828",
					muted: "#667085",
					faint: "#8792A4",
					placeholder: "#98A2B3",
					ink: "#111A2E",
					panel: "#131C36",
				},
				brand: {
					DEFAULT: "#1E5EFF",
					dark: "#1741B8",
					wash: "#EEF3FF",
					border: "#C9D8FF",
				},
				ok: {
					DEFAULT: "#0E9F6E",
					wash: "#E9F5EF",
					border: "#BFE3D3",
					ink: "#0B6B4A",
				},
				warn: {
					DEFAULT: "#DC6803",
					wash: "#FDF3E7",
					border: "#F0D5AC",
					ink: "#8A5209",
				},
				bad: {
					DEFAULT: "#D92D20",
					wash: "#FDECEC",
					border: "#F2C7C7",
					ink: "#9B2C2C",
				},
			},
			spacing: {
				touch: "48px",
			},
			borderRadius: {
				card: "14px",
				panel: "18px",
			},
			boxShadow: {
				card: "0 1px 2px rgba(16, 24, 40, 0.05)",
				raised: "0 8px 24px rgba(16, 24, 40, 0.16)",
				brand: "0 2px 8px rgba(30, 94, 255, 0.28)",
			},
		},
	},
	plugins: [],
}
