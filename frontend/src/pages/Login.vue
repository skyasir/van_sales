<template>
	<!--
		Sign-in against an ERPNext site.

		The site address is a field rather than a build constant so the same
		build serves production and UAT, which is how these get rolled out in
		practice. Served from the bench it is hidden: the origin already names
		the site, and asking a rep to retype it would only invite a typo.
	-->
	<div class="flex min-h-full flex-col bg-surface-gray-1 px-5">
		<div class="safe-top mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 pb-8 pt-12">
			<img :src="logo" alt="" class="mx-auto h-20 w-20 object-contain" />

			<div>
				<h1 class="text-2xl font-semibold text-ink-gray-9">Sign in</h1>
				<p class="mt-1 text-base text-ink-gray-6">Field Operations</p>
			</div>

			<Alert
				v-if="session.staleSession"
				title="Offline session expired"
				theme="yellow"
				:dismissable="false"
				description="You have been offline past the allowed window. Sign in again to keep working."
			/>

			<form class="flex flex-col gap-4" @submit.prevent="submit">
				<FormControl
					v-if="needsSite"
					v-model="site"
					label="Site address"
					type="text"
					size="md"
					placeholder="192.168.1.10:8000 or erp.example.com"
					autocapitalize="none"
					autocorrect="off"
				/>

				<FormControl
					v-model="usr"
					label="User ID"
					type="email"
					size="md"
					placeholder="name@example.ae"
					autocomplete="username"
					autocapitalize="none"
				/>

				<FormControl
					v-model="pwd"
					label="Password"
					:type="showPwd ? 'text' : 'password'"
					size="md"
					placeholder="••••••••"
					autocomplete="current-password"
				>
					<template #suffix>
						<button
							type="button"
							class="text-p-sm font-medium text-ink-blue-2"
							@click="showPwd = !showPwd"
						>
							{{ showPwd ? "Hide" : "Show" }}
						</button>
					</template>
				</FormControl>

				<ErrorMessage v-if="error" :message="error" />

				<Button
					type="submit"
					size="xl"
					variant="solid"
					theme="blue"
					class="w-full"
					:loading="busy"
					:disabled="!canSubmit"
				>
					Sign in
				</Button>
			</form>

			<footer class="mt-auto flex flex-col gap-3 pt-6">
				<p class="text-center text-p-sm text-ink-gray-5">
					Your roles in ERPNext decide what this app shows you.<br />
					Nothing is configured on the phone.
				</p>
				<div class="flex flex-col items-center gap-0.5 border-t border-outline-gray-1 pt-3">
					<span class="text-p-sm font-medium text-ink-gray-6">by Yasir Shaikh</span>
					<a href="mailto:erp.yasirshaikh@gmail.com" class="text-p-sm text-ink-blue-link">
						erp.yasirshaikh@gmail.com
					</a>
				</div>
			</footer>
		</div>
	</div>
</template>

<script setup>
import { Alert, Button, ErrorMessage, FormControl } from "frappe-ui"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"

import logo from "../assets/logo.png"
import { ApiError, isSameOrigin } from "../data/request"
import { session, signIn } from "../data/session"

const router = useRouter()

// Served by the bench, the origin already is the site. Only a Capacitor
// build, which runs on capacitor:// and has no site of its own, has to ask.
const needsSite = !isSameOrigin()

const site = ref(session.lastSite || "")
const usr = ref(session.lastUser || "")
const pwd = ref("")
const showPwd = ref(false)
const busy = ref(false)
const error = ref(null)

const canSubmit = computed(
	() => (!needsSite || site.value.trim()) && usr.value.trim() && pwd.value && !busy.value,
)

async function submit() {
	if (!canSubmit.value) return
	error.value = null
	busy.value = true
	try {
		await signIn({ site: needsSite ? site.value : "", usr: usr.value, pwd: pwd.value })
		router.replace({ name: "gate" })
	} catch (e) {
		error.value =
			e instanceof ApiError ? e.message : "Could not sign in. Check the site address."
	} finally {
		busy.value = false
	}
}
</script>
