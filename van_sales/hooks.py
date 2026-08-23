app_name = "van_sales"
app_title = "Van Sales"
app_publisher = "Yasir Shaikh"
app_description = "Mobile field operations for ERPNext: van sales, pre-sales, logistics, picking and management."
app_email = "erp.yasirshaikh@gmail.com"
app_license = "mit"

# Apps
# ------------------

# Van Sales reads Sales Invoice, Payment Entry, credit limits and item
# pricing from ERPNext. Declaring it here fails the install with a clear
# message instead of at the first API call.
required_apps = ["erpnext"]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "van_sales",
# 		"logo": "/assets/van_sales/logo.png",
# 		"title": "Van Sales",
# 		"route": "/van_sales",
# 		"has_permission": "van_sales.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/van_sales/css/van_sales.css"
# app_include_js = "/assets/van_sales/js/van_sales.js"

# include js, css files in header of web template
# web_include_css = "/assets/van_sales/css/van_sales.css"
# web_include_js = "/assets/van_sales/js/van_sales.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "van_sales/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "van_sales/public/icons.svg"

# Website
# -------

# The mobile app is a single-page app served from the site itself, so every
# in-app route has to resolve to the same entry page. Without this, a rep who
# reloads on /van_sales/customers gets a 404 instead of the app.
website_route_rules = [
	{"from_route": "/van_sales/<path:app_path>", "to_route": "van_sales"},
]

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "van_sales.utils.jinja_methods",
# 	"filters": "van_sales.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "van_sales.install.before_install"
after_install = "van_sales.install.after_install"
after_migrate = "van_sales.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "van_sales.uninstall.before_uninstall"
# after_uninstall = "van_sales.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "van_sales.utils.before_app_install"
# after_app_install = "van_sales.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "van_sales.utils.before_app_uninstall"
# after_app_uninstall = "van_sales.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "van_sales.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "van_sales.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"van_sales.tasks.all"
# 	],
# 	"daily": [
# 		"van_sales.tasks.daily"
# 	],
# 	"hourly": [
# 		"van_sales.tasks.hourly"
# 	],
# 	"weekly": [
# 		"van_sales.tasks.weekly"
# 	],
# 	"monthly": [
# 		"van_sales.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "van_sales.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "van_sales.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "van_sales.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "van_sales.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["van_sales.utils.before_request"]
# after_request = ["van_sales.utils.after_request"]

# Job Events
# ----------
# before_job = ["van_sales.utils.before_job"]
# after_job = ["van_sales.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"van_sales.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

