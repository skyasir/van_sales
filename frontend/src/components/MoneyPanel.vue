<template>
	<!--
		The panel the headline number lives in. One per screen: if everything
		is emphasised, nothing is.

		It is an ordinary raised surface rather than the dark slab the earlier
		build used, so it sits inside the Frappe UI palette and follows the
		light and dark themes instead of fighting them.
	-->
	<section class="rounded-lg border border-outline-gray-2 bg-surface-white p-4 shadow-sm">
		<slot />
	</section>
</template>
