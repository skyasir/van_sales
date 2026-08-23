# Van Sales

By **Yasir Shaikh** — erp.yasirshaikh@gmail.com

Mobile field operations for ERPNext: van sales, pre-sales, logistics, picking
and management, in one app whose screens are decided by the signed-in user's
ERPNext roles.

One repository, three parts:

```
van_sales/          Frappe app  -- doctypes, policy and the mobile API
frontend/           Frappe UI   -- Vue 3 client, served by the bench as a PWA
mobile/             Expo app    -- the earlier React Native client
```

The Frappe UI front end is the current client. It is built with Vue 3 and
`frappe-ui`, and served by the bench itself at `/van_sales`, so a rep installs
it from the browser rather than from a store. The React Native app in
`mobile/` is the build it replaces and is kept for reference; both speak to
the same whitelisted methods in `van_sales/api/`, so the backend never had to
change.

## The Frappe UI front end

```bash
cd frontend
yarn install
yarn dev      # Vite on :8081, proxying the bench
yarn build    # -> van_sales/public/frontend + www/van_sales.html
```

`yarn build` writes the bundle into the app's `public/frontend` folder and
copies the built entry page to `van_sales/www/van_sales.html`. Both are build
output and are gitignored; a fresh clone needs one `yarn build` before the
route serves anything.

Two things are worth knowing about how it talks to Frappe.

**Two transports, one call signature.** Served from the bench the app is
same-origin and rides the ordinary session cookie plus the CSRF token the
entry page carries. Wrapped by Capacitor it would run on a `capacitor://`
origin where that cookie cannot follow, so it falls back to the API key pair
`van_sales.api.auth.login` issues and an absolute base URL. Nothing above
`src/data/request.js` knows which one is in use.

**Errors are unwrapped, and "no signal" is not "no".** Frappe puts the message
a human should read inside `_server_messages`; without unwrapping it every
validation failure reaches the rep as "Internal Server Error" and they never
learn the credit limit stopped them. And a request that never left the handset
is told apart from one the server refused, because a van drives through
basements all day: the first is worth retrying and the second is not.

**The design system is Frappe UI's, not this app's.** `tailwind.config.js`
defines no palette: every surface, ink and outline comes from the preset's
semantic tokens. That is what makes the light/dark switch on the Profile
screen work at all -- there is no second set of colours to keep in step, so
flipping the theme flips every screen at once. The two places that stay fixed
are deliberate: the camera viewfinder, and the 58mm receipt preview, because
the thermal printer has no dark mode.

Deep links work because `website_route_rules` in `hooks.py` maps
`/van_sales/<path>` onto the single entry page -- without it a rep who reloads
on `/van_sales/customers` gets a 404 instead of the app.

## Testing the React Native build on an emulator

The API can be exercised with curl, but that proves nothing about whether
the APK can call it -- a release build once failed every request because
Android blocks cleartext, and curl on the host never saw it. Run the real
thing:

```bash
sdkmanager --sdk_root="$ANDROID_HOME" emulator "system-images;android-36;google_apis;arm64-v8a"
avdmanager create avd -n vansales -k "system-images;android-36;google_apis;arm64-v8a"
emulator -avd vansales -no-window -gpu swiftshader_indirect &
adb wait-for-device
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n ae.gulfpantry.vansales/.MainActivity
adb exec-out screencap -p > shot.png
```

The emulator cannot reach the host's LAN IP -- it is NAT'd -- so sign in
against `10.0.2.2:8000`, which is the host as seen from inside it.

## Branding

`mobile/assets/logo-source.png` is the master artwork. The icon set is
derived from it: the Android adaptive foreground insets the badge to the
central 66%, because a launcher mask crops everything outside that and
would otherwise cut off the SALES APP banner. The adaptive background is
flat `#000104`, sampled from the artwork's own edge, so the inset square
leaves no visible seam.

## Design decisions worth knowing

**ERPNext's interactions, not ERPNext's looks.** A rep who fills in a Sales
Invoice on the desk should recognise this app without being taught it, so
the document shape is the same: a Customer link field at the top, item
rows, then totals. Tapping a link field opens a searchable picker, exactly
like clicking a Link field on the desk. Simple lookups go through
``frappe.desk.search.search_link`` -- the endpoint the desk itself uses --
so results, ordering and user permissions behave identically.

The picker is a sheet rather than a route, so choosing a customer never
navigates away from the invoice being built. The visual language stays the
app's own: simple, modern, and shaped around the van sales workflow rather
than around a desk.

**The invoice carries its own payment.** A van cash or cheque sale is one
document: a Sales Invoice against the van's warehouse with `update_stock`
on and the payment on the invoice itself. It posts once and comes back
`Paid` with nothing outstanding, and stock leaves the van at the same time,
so there is no separate delivery note or receipt to reconcile.

ERPNext only writes those payment rows to the ledger from
`make_pos_gl_entries`, which is gated on `is_pos` — so a settled invoice is
flagged POS. Without that flag the rows would sit on the document while the
customer still showed as owing the full amount, which is worse than not
having them. **No POS Profile is created or read**: `ignore_pos_profile`
stops ERPNext looking for one, and the accounts come from the Van Sales
Profile. Turn this off with **Record Payment on the Invoice** in Van Sales
Settings to go back to invoice-plus-separate-receipt.

A credit sale carries no payment rows, is not flagged POS, and is simply
left outstanding. A **post-dated cheque is refused** on an invoice: the
money has not arrived, so settling against it would erase the debt weeks
before it clears. It belongs on a held Payment Entry.

**Almost nothing is a new doctype.** Deliveries are ERPNext `Delivery Trip`s,
picking is `Pick List`, replenishment is `Material Request`, receipts are
`Payment Entry`, returns are credit notes, and credit limits are ERPNext's
own. The only additions are `Van Sales Profile` (which van a rep is on) and
`Van Sales Settings` (site policy).

**Roles decide the app, not the build.** `van_sales.api.session.bootstrap`
returns the home screen and tab set for the user's roles. Adding a role on
the desk changes the app at the next sync; nothing is configured on the
handset.

**Every write is idempotent.** The device generates a `client_uid` before a
document is queued. `van_client_uid` is a unique field on Sales Invoice,
Sales Order, Payment Entry, Delivery Note and Material Request, so an
offline retry resolves to the original document instead of posting twice.
Frappe coerces empty unique values to NULL, so desk-created documents never
collide.

**Money is calculated server-side.** The cart calls
`van_sales.api.selling.quote`, which builds the real invoice in memory and
returns its totals. The app never computes tax.

**A lost handset can be cut off from any phone.** Signing in reuses the
existing key pair rather than minting a new one, so a rep signing in on a
second device does not knock the first offline mid-route. The cost of that
is that signing out locally only clears *this* device -- no help when the
problem is a phone you no longer hold. **Sign out all devices** in My
Profile drops the pair server-side, so every device holding it fails at its
next request; signing in again mints a fresh pair, locking out the lost
handset without locking out the user.

**Your profile is yours; your employment record is HR's.** My Profile joins
the User record to the Employee linked by `user_id` and writes back to
both, but only through an explicit allow-list: contact details are
editable, while designation, department, joining date and reporting line
are shown and locked. The payload is never applied wholesale, so roles,
`enabled`, `user_type` and the email are unreachable from the app by
construction rather than by validation.

**Credit notes, referenced or not.** Raised from an invoice, the credit
references its parent -- that ties it to a price the customer actually paid
and lets ERPNext settle the original. Raised standalone from a customer, it
posts as an open credit for the cases a reference cannot cover: goods sold
before go-live, a negotiated allowance, or a return whose invoice cannot be
found at the door. Either way the reason per line decides whether the goods
go back into saleable van stock or to scrap.

**Field collections are drafts.** A collection against invoices raised
earlier — the driver case — posts as a draft Payment Entry for the cashier
to finalise. One person does not both hold the cash and close the books on
it. That is separate from a van sale settling at the door, which is a single
paid invoice.

## Setting up a van

1. Tick **Is a Van** on the warehouse the stock travels in.
2. Create a **Van Sales Profile**: company, that warehouse, price list,
   payment modes, and the users assigned to it. A user may be on only one
   van, so "which stock am I holding" is never ambiguous.
3. Give the user the **Van Sales User** role, plus the standard ERPNext
   roles that grant the underlying document access (Sales User, Accounts
   User, Stock User).
4. Review **Van Sales Settings** for barcode, offline, credit and negative
   stock policy.

## Running the mobile app

```bash
cd mobile
npm install
npx expo start          # scan the QR with Expo Go
npm run typecheck
```

The phone must be able to reach the ERPNext site, so `site1.localhost:8000`
will not work from a handset. Two things make a dev bench reachable:

1. `frappe serve` already binds `0.0.0.0`, so use the machine's LAN address
   (`ipconfig getifaddr en0` on macOS) — for example `192.168.0.103:8000`.
2. Set `default_site` in `sites/common_site_config.json`. Frappe resolves a
   site from the `Host` header, and an IP matches no site directory, so
   without a default the request is rejected before it reaches any app.

```json
{ "default_site": "site1.localhost" }
```

The app picks `http` for localhost, `.local` and private LAN ranges, and
`https` for everything else, so typing a bare LAN address works as typed.

Android blocks plain-HTTP traffic by default from API 28, and Expo only
permits it in the *debug* manifest — a release APK silently fails every
request to a LAN bench with "No connection to the server". The
`expo-build-properties` plugin sets `usesCleartextTraffic` so release
builds can reach an on-prem server. Anything on a real hostname still gets
https.

On macOS, check the firewall is not blocking the bench's python:

```bash
/usr/libexec/ApplicationFirewall/socketfilterfw --listapps | grep -i python
```

## Building an APK

### Locally

Needs a JDK and the Android SDK. On macOS, without sudo:

```bash
brew install openjdk@17
brew install --cask android-commandlinetools

export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$PATH"

yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" platform-tools "platforms;android-36" "build-tools;36.0.0"
```

Then:

```bash
cd mobile
npm install
npx expo prebuild --platform android      # generates android/, which is gitignored
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
bash scripts/setup-release-signing.sh     # release keystore, once per machine
cd android && ./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

`expo prebuild` regenerates `android/` and signs release builds with the
*debug* keystore. `scripts/setup-release-signing.sh` creates a real release
key in `~/.van-sales/`, puts its passwords in `~/.gradle/gradle.properties`
(both outside the repo), and repoints the release build at it. Re-run it
after any `prebuild --clean`.

**Back up `~/.van-sales/van-sales-release.keystore`.** Android refuses to
install an update signed with a different key, so losing it means every
device has to uninstall first.

### In the cloud

Needs no local toolchain, but does need an Expo account:

```bash
cd mobile
npx eas login
npx eas build --platform android --profile preview
```

`preview` produces an APK for sideloading. `production` produces an app
bundle for Play. `development` produces a dev client, which is what the
Bluetooth thermal printing work will need.

## Status

Built and verified end to end against a live site:

- token sign-in, role-driven navigation, offline session window
- customers with outstanding, credit limit and ageing; statement of account
- barcode scan to priced line, checked against van stock
- server-priced cart, invoice post, credit-limit block
- cash sale settling on the invoice, change computed, cash posted to the ledger
- post-dated cheque refused as an invoice settlement
- draft receipts with oldest-first allocation
- idempotent replay of a retried post
- profile read/write round-tripping to ERPNext, with role escalation and
  HR-owned fields rejected
- sign out on this device, and sign out everywhere for a lost handset

Not built yet: pre-sales orders and team-leader approval, driver trips and
delivery confirmation, store picking and loading, the management dashboard,
and Bluetooth ESC/POS printing. Those screens exist in the app and say so
rather than showing placeholder data.
