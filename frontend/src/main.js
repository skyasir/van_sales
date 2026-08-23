import { createApp } from "vue"
import { Button, FrappeUI, setConfig } from "frappe-ui"

import App from "./App.vue"
import router from "./router"
import { request } from "./data/request"
import { watchForeground } from "./data/session"
import { initTheme } from "./data/theme"
import "./main.css"

// Point frappe-ui's resources at this app's transport, so anything built
// with createResource still gets the unwrapped Frappe error message and the
// offline flag rather than a bare "Internal Server Error".
setConfig("resourceFetcher", (options) =>
	request(options.url ?? options.method, {
		method: options.type?.toUpperCase() === "POST" ? "POST" : "GET",
		args: options.params ?? options.args ?? {},
	}),
)

const app = createApp(App)

app.use(router)
app.use(FrappeUI)
app.component("Button", Button)

// Before mount, so the first paint is already in the right theme.
initTheme()
watchForeground()

app.mount("#app")
