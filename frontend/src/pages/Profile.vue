<template>
	<!--
		My Profile.

		The screen is honest about who owns each piece of data. Contact details
		are editable because they are the user's own. The employment block --
		designation, department, joining date, reporting line -- is shown but
		locked, because it is HR's record; letting a rep edit their own
		designation on a phone is not profile management.

		Which fields are editable is not decided here. The server returns an
		`editable` list and this screen renders against it, so tightening the
		policy on the server tightens the UI at the next sync rather than
		needing a new build.
	-->
	<div>
		<PageHeader title="My profile" :subtitle="session.bootstrap?.user?.id ?? ''">
			<template #right>
				<button
					v-if="d && !editing"
					type="button"
					class="rounded-lg px-2 py-1.5 text-[13px] font-bold text-ink-blue-2 active:bg-surface-blue-2"
					@click="startEditing"
				>
					Edit
				</button>
			</template>
		</PageHeader>

		<ScreenBody>
			<div v-if="profile.loading.value && !d" class="py-6 text-center">
				<LoadingIndicator class="mx-auto h-5 w-5 text-ink-blue-2" />
			</div>

			<ErrorState
				v-else-if="profile.error.value"
				:message="profile.error.value"
				:offline="profile.offline.value"
				:on-retry="profile.reload"
			/>

			<template v-else-if="d">
				<MoneyPanel>
					<div class="flex items-center gap-3">
						<Avatar size="2xl" :image="d.user.user_image" :label="d.user.full_name" />

						<div class="min-w-0 flex-1">
							<p class="truncate text-lg font-semibold text-ink-gray-9">
								{{ d.user.full_name }}
							</p>
							<p class="truncate text-[12.5px] text-ink-gray-6">{{ d.user.email }}</p>
							<p
								v-if="d.employee?.designation"
								class="truncate text-[11.5px] text-ink-gray-5"
							>
								{{ d.employee.designation }}
							</p>
						</div>
					</div>
				</MoneyPanel>

				<Alert v-if="saved" theme="green" title="Profile saved" :dismissable="false" />
				<Alert v-if="error" theme="red" title="Not saved" :dismissable="false">
					{{ error }}
				</Alert>

				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">Contact</p>
				<div
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex flex-col gap-3 p-3.5"
				>
					<ProfileField
						v-model="draft.first_name"
						label="First name"
						:editing="editing && canEditUser('first_name')"
					/>
					<ProfileField
						v-model="draft.last_name"
						label="Last name"
						:editing="editing && canEditUser('last_name')"
					/>
					<ProfileField
						v-model="draft.mobile_no"
						label="Mobile"
						type="tel"
						mono
						:editing="editing && canEditUser('mobile_no')"
					/>
					<ProfileField
						v-model="draft.phone"
						label="Phone"
						type="tel"
						mono
						:editing="editing && canEditUser('phone')"
					/>
					<ProfileField
						v-model="draft.location"
						label="Location"
						:editing="editing && canEditUser('location')"
					/>
				</div>

				<template v-if="d.employee">
					<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
						Employment
					</p>
					<div
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex flex-col gap-3 p-3.5"
					>
						<ProfileField label="Employee ID" :model-value="d.employee.name" mono />
						<ProfileField
							label="Designation"
							:model-value="d.employee.designation ?? '—'"
						/>
						<ProfileField
							label="Department"
							:model-value="d.employee.department ?? '—'"
						/>
						<ProfileField label="Branch" :model-value="d.employee.branch ?? '—'" />
						<ProfileField
							label="Joined"
							:model-value="shortDate(d.employee.date_of_joining, true)"
						/>
						<ProfileField
							label="Reports to"
							:model-value="
								d.employee.reports_to_name ?? d.employee.reports_to ?? '—'
							"
						/>
					</div>

					<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
						Personal &amp; emergency
					</p>
					<div
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex flex-col gap-3 p-3.5"
					>
						<ProfileField
							v-model="employeeDraft.personal_email"
							label="Personal email"
							type="email"
							:editing="editing && canEditEmployee('personal_email')"
						/>
						<ProfileField
							v-model="employeeDraft.cell_number"
							label="Personal mobile"
							type="tel"
							mono
							:editing="editing && canEditEmployee('cell_number')"
						/>
						<ProfileField
							v-model="employeeDraft.emergency_phone_number"
							label="Emergency contact"
							type="tel"
							mono
							:editing="editing && canEditEmployee('emergency_phone_number')"
						/>
						<ProfileField
							v-model="employeeDraft.current_address"
							label="Address"
							:editing="editing && canEditEmployee('current_address')"
						/>
					</div>
				</template>

				<!-- Which job am I doing right now ------------------------- -->
				<template v-if="(session.bootstrap?.personas?.length ?? 0) > 1">
					<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
						Working as
					</p>
					<div
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-2"
					>
						<button
							v-for="p in session.bootstrap.personas"
							:key="p"
							type="button"
							class="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-3 text-left"
							:class="p === session.persona ? 'bg-surface-blue-2' : ''"
							@click="switchPersona(p)"
						>
							<FeatherIcon
								:name="p === session.persona ? 'check-circle' : 'circle'"
								class="h-5 w-5"
								:class="
									p === session.persona ? 'text-ink-blue-2' : 'text-ink-gray-4'
								"
							/>
							<span
								class="text-[14.5px]"
								:class="
									p === session.persona
										? 'font-bold text-ink-blue-2'
										: 'text-ink-gray-8'
								"
							>
								{{ PERSONA_LABELS[p] ?? p }}
							</span>
						</button>
					</div>
				</template>

				<!-- A van cab in daylight and a chiller at 5am are genuinely
				     different rooms, so the choice is offered rather than guessed. -->
				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
					Appearance
				</p>
				<div
					class="rounded-lg border border-outline-gray-2 bg-surface-white p-3.5 shadow-sm"
				>
					<TabButtons
						class="w-full"
						:model-value="theme"
						:buttons="THEMES"
						@update:model-value="setTheme"
					/>
				</div>

				<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">Access</p>
				<div
					v-if="d.van"
					class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex flex-col gap-3 p-3.5"
				>
					<ProfileField label="Van" :model-value="d.van.profile" mono />
					<ProfileField label="Warehouse" :model-value="d.van.warehouse_name" />
					<ProfileField label="Company" :model-value="d.van.company" />
					<ProfileField label="Price list" :model-value="d.van.price_list" />
				</div>
				<EmptyState v-else text="No Van Sales Profile is assigned to you." />

				<div v-if="editing" class="flex gap-2.5">
					<Button class="h-touch flex-1" variant="outline" @click="cancelEditing"
						>Cancel</Button
					>
					<Button
						class="h-touch flex-1"
						variant="solid"
						theme="blue"
						:loading="saving"
						@click="save"
					>
						Save
					</Button>
				</div>

				<template v-else>
					<div
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm p-3.5"
					>
						<div class="flex justify-between">
							<span class="text-[13px] text-ink-gray-6">Last sign-in</span>
							<span class="money text-xs font-medium text-ink-gray-6">
								{{ shortDate(d.user.last_login, true) }}
							</span>
						</div>
						<div class="mt-1.5 flex justify-between">
							<span class="text-[13px] text-ink-gray-6">Site</span>
							<span class="money truncate text-xs font-medium text-ink-gray-6">{{
								siteLabel
							}}</span>
						</div>
					</div>

					<p class="text-p-sm font-medium uppercase tracking-wide text-ink-gray-5">
						About
					</p>
					<div
						class="rounded-lg border border-outline-gray-2 bg-surface-white shadow-sm flex items-center gap-3 p-3.5"
					>
						<img :src="logo" alt="" class="h-10 w-10 object-contain" />
						<div class="min-w-0 flex-1">
							<p class="text-[14.5px] font-semibold text-ink-gray-8">Van Sales</p>
							<p class="text-xs text-ink-gray-6">by Yasir Shaikh</p>
							<a
								href="mailto:erp.yasirshaikh@gmail.com"
								class="text-xs text-ink-blue-2"
							>
								erp.yasirshaikh@gmail.com
							</a>
						</div>
						<span class="money shrink-0 text-xs font-medium text-ink-gray-5"
							>v{{ appVersion }}</span
						>
					</div>

					<button
						type="button"
						class="flex h-touch items-center justify-center gap-2 rounded-lg border border-outline-gray-2 bg-surface-white text-[15px] font-bold text-ink-red-3 active:bg-surface-red-2"
						@click="confirmSignOut"
					>
						<FeatherIcon name="log-out" class="h-[18px] w-[18px]" />
						Sign out
					</button>

					<button
						type="button"
						class="text-center text-[12.5px] font-semibold text-ink-gray-5 underline"
						@click="confirmRevokeAll"
					>
						Sign out all devices
					</button>
				</template>
			</template>
		</ScreenBody>

		<!-- Sign out ------------------------------------------------------ -->
		<Dialog
			v-model="signOutOpen"
			:options="{
				title: 'Sign out?',
				message:
					'Anything still queued on this device has not reached the server yet and will be lost.',
				actions: [
					{ label: 'Sign out', variant: 'solid', theme: 'red', onClick: doSignOut },
					{ label: 'Stay signed in', onClick: () => (signOutOpen = false) },
				],
			}"
		/>

		<!--
			For a handset that has been lost or stolen. Signing out normally only
			clears the key from *this* device, which is no help when the problem
			is a phone you no longer hold. This drops the key pair on the server,
			so every device holding it stops working at its next request.

			Signing in again mints a fresh pair, so the user is not locked out --
			only whoever has the old handset is.
		-->
		<Dialog
			v-model="revokeOpen"
			:options="{
				title: 'Sign out all devices?',
				message:
					'Every phone signed in as you stops working immediately, including this one. Use this if a handset has been lost or stolen.\n\nSigning in again will get this phone working; the lost one stays locked out.',
				actions: [
					{
						label: 'Sign out everywhere',
						variant: 'solid',
						theme: 'red',
						loading: revoking,
						onClick: doRevokeAll,
					},
					{ label: 'Cancel', onClick: () => (revokeOpen = false) },
				],
			}"
		/>
	</div>
</template>

<script setup>
import { Alert, Avatar, Button, Dialog, FeatherIcon, LoadingIndicator, TabButtons } from "frappe-ui"
import { computed, reactive, ref } from "vue"
import { useRouter } from "vue-router"

import EmptyState from "../components/EmptyState.vue"
import ErrorState from "../components/ErrorState.vue"
import MoneyPanel from "../components/MoneyPanel.vue"
import PageHeader from "../components/PageHeader.vue"
import ProfileField from "../components/ProfileField.vue"
import ScreenBody from "../components/ScreenBody.vue"
import logo from "../assets/logo.png"
import { api } from "../data/api"
import { shortDate } from "../data/format"
import { ApiError, storedToken } from "../data/request"
import { refresh, session, setPersona, signOut } from "../data/session"
import { setTheme, theme } from "../data/theme"
import { useAsync } from "../data/useAsync"

const router = useRouter()

const THEMES = [
	{ label: "Light", value: "light" },
	{ label: "Dark", value: "dark" },
	{ label: "System", value: "system" },
]

const PERSONA_LABELS = {
	van: "Van Sales",
	pre_sales: "Pre-Sales",
	team_leader: "Team Leader",
	driver: "Logistics",
	store: "Store In-charge",
	management: "Management",
}

const appVersion = __APP_VERSION__

const profile = useAsync(() => api.getProfile())
const d = computed(() => profile.data.value)

const editing = ref(false)
const saving = ref(false)
const saved = ref(false)
const error = ref(null)
const signOutOpen = ref(false)
const revokeOpen = ref(false)
const revoking = ref(false)

const draft = reactive({})
const employeeDraft = reactive({})

const siteLabel = computed(() => {
	const site = storedToken()?.site ?? window.location.origin
	return site.replace(/^https?:\/\//, "")
})

function canEditUser(field) {
	return Boolean(d.value?.editable?.user?.includes(field))
}

function canEditEmployee(field) {
	return Boolean(d.value?.editable?.employee?.includes(field))
}

function startEditing() {
	const user = d.value.user
	Object.assign(draft, {
		first_name: user.first_name ?? "",
		last_name: user.last_name ?? "",
		mobile_no: user.mobile_no ?? "",
		phone: user.phone ?? "",
		location: user.location ?? "",
	})

	const employee = d.value.employee ?? {}
	Object.assign(employeeDraft, {
		personal_email: employee.personal_email ?? "",
		cell_number: employee.cell_number ?? "",
		emergency_phone_number: employee.emergency_phone_number ?? "",
		current_address: employee.current_address ?? "",
	})

	saved.value = false
	error.value = null
	editing.value = true
}

function cancelEditing() {
	editing.value = false
	error.value = null
}

async function save() {
	if (!d.value) return
	saving.value = true
	error.value = null
	saved.value = false

	try {
		// Only send what the server said it accepts. Anything else would be
		// dropped anyway; not sending it keeps the intent obvious.
		const payload = {}
		for (const [field, value] of Object.entries(draft)) {
			if (canEditUser(field)) payload[field] = value
		}

		const employee = {}
		for (const [field, value] of Object.entries(employeeDraft)) {
			if (canEditEmployee(field)) employee[field] = value
		}
		if (Object.keys(employee).length) payload.employee = employee

		await api.updateProfile(payload)
		await profile.reload()
		// The header and greeting read from bootstrap, so pull that again or a
		// changed name would keep showing the old one until next sign-in.
		await refresh()

		editing.value = false
		saved.value = true
	} catch (e) {
		error.value = e instanceof ApiError ? e.message : "Could not save your profile."
	} finally {
		saving.value = false
	}
}

function switchPersona(persona) {
	setPersona(persona)
	router.replace({ name: "gate" })
}

function confirmSignOut() {
	signOutOpen.value = true
}

async function doSignOut() {
	await signOut()
	router.replace({ name: "login" })
}

function confirmRevokeAll() {
	revokeOpen.value = true
}

async function doRevokeAll() {
	revoking.value = true
	error.value = null
	try {
		await api.revokeAllDevices()
		// Local credentials are now dead server-side; clearing them keeps the
		// app from retrying with a token that cannot work.
		await signOut()
		router.replace({ name: "login" })
	} catch (e) {
		revokeOpen.value = false
		error.value = e instanceof ApiError ? e.message : "Could not sign out the other devices."
	} finally {
		revoking.value = false
	}
}
</script>
