import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { VitePWA } from "vite-plugin-pwa"
import frappeui from "frappe-ui/vite"
import path from "path"
import fs from "fs"

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"))

export default defineConfig({
	// The About block shows the build the rep is actually running, which is
	// the first thing worth knowing when a bug report comes in from a van.
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
	},
	plugins: [
		// Owns the bench proxy, the asset base URL, the build output directory
		// and copying the built index.html to www/van_sales.html.
		frappeui({ frontendRoute: "/van_sales" }),
		vue(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: "auto",
			manifest: {
				display: "standalone",
				name: "Van Sales",
				short_name: "Van Sales",
				start_url: "/van_sales",
				description:
					"Mobile field operations for ERPNext: van sales, pre-sales, logistics and picking.",
				theme_color: "#101828",
				background_color: "#000104",
				orientation: "portrait",
				icons: [
					{
						src: "/assets/van_sales/manifest/icon-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/assets/van_sales/manifest/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				// The van drives through basements. The shell is cached so the app
				// opens without signal; API calls are never cached, because a stale
				// receivable figure is worse than an honest error.
				globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
				navigateFallback: null,
			},
		}),
	],
	server: {
		port: 8081,
		allowedHosts: true,
	},
	resolve: {
		alias: { "@": path.resolve(__dirname, "src") },
	},
	build: {
		target: "es2015",
		rollupOptions: {
			output: { manualChunks: { "frappe-ui": ["frappe-ui"] } },
		},
	},
	optimizeDeps: {
		include: ["frappe-ui > feather-icons", "showdown", "tailwind.config.js"],
	},
})
