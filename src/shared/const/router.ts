export enum AppRoutes {
	MAIN = "main",
	AUTH = "auth",
	ONBOARDING = "onboarding",
	FORECAST = "forecast",
	IMPORT = "import",
	OPERATIONS = "operations",
	RECURRING = "recurring",
	PLANS = "plans",
	PLAN_FACT = "plan_fact",
	QUALITY = "quality",
	SETTINGS = "settings",
	PROFILE = "profile",
	// последний
	NOT_FOUND = "not_found",
}

export const RoutePath: Record<AppRoutes, string> = {
	[AppRoutes.MAIN]: "/",
	[AppRoutes.AUTH]: "/auth",
	[AppRoutes.ONBOARDING]: "/onboarding",
	[AppRoutes.FORECAST]: "/forecast",
	[AppRoutes.IMPORT]: "/import",
	[AppRoutes.OPERATIONS]: "/operations",
	[AppRoutes.RECURRING]: "/recurring",
	[AppRoutes.PLANS]: "/plans",
	[AppRoutes.PLAN_FACT]: "/plan-fact",
	[AppRoutes.QUALITY]: "/quality",
	[AppRoutes.SETTINGS]: "/settings",
	[AppRoutes.PROFILE]: "/profile",
	[AppRoutes.NOT_FOUND]: "*",
};
