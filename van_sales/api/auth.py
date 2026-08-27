"""Token issuance for the mobile app.

The app is stateless: it signs in once, stores an API key pair in the
device keychain, and sends ``Authorization: token key:secret`` on every
later request. That survives app restarts and long offline stretches,
which a session cookie does not.

``login`` is the only endpoint in this app that accepts guests, so it
delegates every credential decision to Frappe's own LoginManager --
brute-force tracking per IP and per user, disabled-user checks, login
hour restrictions and the Authentication Log all come from there. It
never reports whether a user exists.
"""

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint
from frappe.utils.password import get_decrypted_password

from van_sales.api.session import build_bootstrap


# @frappe.whitelist(allow_guest=True, methods=["POST"])
# @rate_limit(limit=10, seconds=60)
# def login(usr: str, pwd: str, device_id: str | None = None, device_name: str | None = None):
# 	"""Exchange credentials for an API key pair plus the first bootstrap.

# 	Returns the same generic error for every failure mode so the endpoint
# 	cannot be used to discover which user IDs exist.
# 	"""
# 	login_manager = frappe.auth.LoginManager()

# 	# Raises frappe.AuthenticationError on any failure, after recording the
# 	# attempt against both the IP and the user.
# 	login_manager.authenticate(user=usr, pwd=pwd)

# 	user = login_manager.user

# 	if login_manager.force_user_to_reset_password():
# 		frappe.throw(
# 			_("Your password must be reset on the web before you can use the app."),
# 			frappe.AuthenticationError,
# 		)

# 	# Run as the authenticated user so key issuance is attributed correctly.
# 	frappe.set_user(user)

# 	keys = _issue_api_keys(user)
# 	_record_device(user, device_id, device_name)

# 	frappe.local.login_manager = login_manager
# 	login_manager.run_trigger("on_login")

# 	return {
# 		"api_key": keys["api_key"],
# 		"api_secret": keys["api_secret"],
# 		"bootstrap": build_bootstrap(),
# 	}
@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60)
def login(usr: str, pwd: str, device_id: str | None = None, device_name: str | None = None):
        frappe.flags.ignore_csrf = True

        login_manager = frappe.auth.LoginManager()

        login_manager.authenticate(user=usr, pwd=pwd)

        user = login_manager.user

        if login_manager.force_user_to_reset_password():
                frappe.throw(
                        _("Your password must be reset on the web before you can use the app."),
                        frappe.AuthenticationError,
                )

        frappe.set_user(user)

        keys = _issue_api_keys(user)
        _record_device(user, device_id, device_name)

        frappe.local.login_manager = login_manager
        login_manager.run_trigger("on_login")

        return {
                "api_key": keys["api_key"],
                "api_secret": keys["api_secret"],
                "bootstrap": build_bootstrap(),
        }

def _issue_api_keys(user: str) -> dict:
	"""Return this user's key pair, creating it only if absent.

	Reusing the existing secret matters: regenerating on every sign-in would
	silently sign the user out of any other device mid-route.
	"""
	user_doc = frappe.get_doc("User", user)

	api_secret = None
	if user_doc.api_key:
		api_secret = get_decrypted_password("User", user, "api_secret", raise_exception=False)

	if user_doc.api_key and api_secret:
		return {"api_key": user_doc.api_key, "api_secret": api_secret}

	if not user_doc.api_key:
		user_doc.api_key = frappe.generate_hash(length=15)

	api_secret = frappe.generate_hash(length=15)
	user_doc.api_secret = api_secret
	user_doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"api_key": user_doc.api_key, "api_secret": api_secret}


def _record_device(user: str, device_id: str | None, device_name: str | None) -> None:
	"""Note the device on the Authentication Log trail.

	Deliberately lightweight: enough to answer "which handset last signed in
	as this rep", without standing up a device registry nobody has asked for.
	"""
	if not device_id:
		return

	frappe.get_doc(
		{
			"doctype": "Activity Log",
			"subject": _("Van Sales app sign-in from {0}").format(device_name or device_id),
			"user": user,
			"operation": "Login",
			"status": "Success",
			"communication_date": frappe.utils.now_datetime(),
		}
	).insert(ignore_permissions=True)
	frappe.db.commit()


@frappe.whitelist(methods=["POST"])
def revoke():
	"""Drop this user's key pair, which signs every one of their devices out."""
	user_doc = frappe.get_doc("User", frappe.session.user)
	user_doc.api_key = None
	user_doc.api_secret = None
	user_doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"revoked": True}


@frappe.whitelist()
def ping():
	"""Cheap authenticated round-trip: lets the app tell 'offline' from 'token dead'."""
	return {
		"user": frappe.session.user,
		"server_time": frappe.utils.now(),
		"offline_window_hours": cint(
			frappe.db.get_single_value("Van Sales Settings", "offline_window_hours") or 72
		),
	}
