<template>
	<!--
		Sign-in against an ERPNext site.

		The site address is a field rather than a build constant so the same
		build serves production and UAT, which is how these get rolled out in
		practice. Served from the bench it is hidden: the origin already names
		the site, and asking a rep to retype it would only invite a typo.
	-->
	<div class="flex min-h-full flex-col bg-[#101828] px-[22px]">
		<div class="safe-top flex flex-1 flex-col gap-3 pb-8 pt-10">
			<img :src="logo" alt="" class="mx-auto h-24 w-24 object-contain" />

			<h1 class="mt-3 text-[26px] font-semibold -tracking-[0.02em] text-white">Sign in</h1>
			<p class="-mt-2 text-[13.5px] text-white/55">Field Operations</p>

			<div
				v-if="session.staleSession"
				class="rounded-xl border border-[rgba(240,213,172,0.4)] bg-[rgba(220,104,3,0.16)] p-3"
			>
				<p class="text-[12.5px] leading-[18px] text-[#F5C88B]">
					You have been offline past the allowed window. Sign in again to keep working.
				</p>
			</div>

			<form class="mt-2 flex flex-col gap-3" @submit.prevent="submit">
				<label v-if="needsSite" class="flex flex-col gap-[7px]">
					<span class="text-[11px] font-bold uppercase tracking-[0.09em] text-white/45">
						Site address
					</span>
					<input
						v-model="site"
						type="url"
						inputmode="url"
						autocapitalize="none"
						autocorrect="off"
						placeholder="192.168.1.10:8000 or erp.example.com"
						class="money h-[54px] rounded-xl border border-white/[0.16] bg-white/[0.06] px-3.5 text-[14.5px] text-white placeholder:text-white/30 focus:border-brand focus:outline-none"
					/>
				</label>

				<label class="flex flex-col gap-[7px]">
					<span class="text-[11px] font-bold uppercase tracking-[0.09em] text-white/45">
						User ID
					</span>
					<input
						v-model="usr"
						type="email"
						inputmode="email"
						autocapitalize="none"
						autocorrect="off"
						autocomplete="username"
						placeholder="name@example.ae"
						class="h-[54px] rounded-xl border border-white/[0.16] bg-white/[0.06] px-3.5 text-[15.5px] text-white placeholder:text-white/30 focus:border-brand focus:outline-none"
					/>
				</label>

				<label class="flex flex-col gap-[7px]">
					<span class="text-[11px] font-bold uppercase tracking-[0.09em] text-white/45">
						Password
					</span>
					<div
						class="flex h-[54px] items-center rounded-xl border border-white/[0.16] bg-white/[0.06] px-3.5 focus-within:border-brand"
					>
						<input
							v-model="pwd"
							:type="showPwd ? 'text' : 'password'"
							autocapitalize="none"
							autocomplete="current-password"
							placeholder="••••••••"
							class="min-w-0 flex-1 bg-transparent text-[15.5px] text-white placeholder:text-white/30 focus:outline-none"
						/>
						<button
							type="button"
							class="px-1.5 py-2 text-xs font-bold text-[#8FB0FF]"
							@click="showPwd = !showPwd"
						>
							{{ showPwd ? "HIDE" : "SHOW" }}
						</button>
					</div>
				</label>

				<div
					v-if="error"
					class="rounded-xl border border-[rgba(242,199,199,0.35)] bg-[rgba(217,45,32,0.16)] p-3"
				>
					<p class="whitespace-pre-line text-[13px] leading-[19px] text-[#FDA29B]">
						{{ error }}
					</p>
				</div>

				<button
					type="submit"
					:disabled="!canSubmit"
					class="mt-2 flex h-14 items-center justify-center rounded-card bg-brand text-[16.5px] font-bold text-white shadow-brand active:opacity-85 disabled:opacity-45"
				>
					<LoadingIndicator v-if="busy" class="h-5 w-5 text-white" />
					<span v-else>Sign in</span>
				</button>
			</form>

			<footer class="mt-auto flex flex-col gap-3 pt-5">
				<p class="text-center text-[11.5px] leading-[17px] text-white/35">
					Your roles in ERPNext decide what this app shows you.<br />
					Nothing is configured on the phone.
				</p>
				<div class="flex flex-col items-center gap-0.5 border-t border-white/[0.08] pt-3">
					<span class="text-[12.5px] font-semibold text-white/55">by Yasir Shaikh</span>
					<a href="mailto:erp.yasirshaikh@gmail.com" class="text-xs text-[#8FB0FF]">
						erp.yasirshaikh@gmail.com
					</a>
				</div>
			</footer>
		</div>
	</div>
</template>

<script setup>
import { LoadingIndicator } from "frappe-ui"
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
