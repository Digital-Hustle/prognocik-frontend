import { Navigate } from "react-router-dom";
import { AuthPage } from "@/pages/AuthPage";
import { DemoImportPage } from "@/pages/DemoImportPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { ForecastPage } from "@/pages/ForecastPage";
import { ImportPage } from "@/pages/ImportPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { OperationsPage } from "@/pages/OperationsPage";
import { PlanFactPage } from "@/pages/PlanFactPage";
import { PlansPage } from "@/pages/PlansPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { QualityPage } from "@/pages/QualityPage";
import { RecurringPage } from "@/pages/RecurringPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AppRoutes, RoutePath } from "@/shared/const/router";
import type { AppRoutesProps } from "@/shared/types/router";

export const routeConfig: Record<AppRoutes, AppRoutesProps> = {
	[AppRoutes.MAIN]: {
		path: RoutePath.main,
		element: (
			<Navigate
				to={RoutePath.forecast}
				replace
			/>
		),
		authOnly: true,
	},
	[AppRoutes.AUTH]: {
		path: RoutePath.auth,
		element: <AuthPage />,
		guestOnly: true,
	},
	[AppRoutes.ONBOARDING]: {
		path: RoutePath.onboarding,
		element: <OnboardingPage />,
		authOnly: true,
	},
	[AppRoutes.DEMO_IMPORT]: {
		path: RoutePath.demo_import,
		element: <DemoImportPage />,
		authOnly: true,
	},
	[AppRoutes.FORECAST]: {
		path: RoutePath.forecast,
		element: <ForecastPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.IMPORT]: {
		path: RoutePath.import,
		element: <ImportPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.OPERATIONS]: {
		path: RoutePath.operations,
		element: <OperationsPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.RECURRING]: {
		path: RoutePath.recurring,
		element: <RecurringPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.PLANS]: {
		path: RoutePath.plans,
		element: <PlansPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.PLAN_FACT]: {
		path: RoutePath.plan_fact,
		element: <PlanFactPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.QUALITY]: {
		path: RoutePath.quality,
		element: <QualityPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.INTEGRATIONS]: {
		path: RoutePath.integrations,
		element: <IntegrationsPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.EMPLOYEES]: {
		path: RoutePath.employees,
		element: <EmployeesPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.SETTINGS]: {
		path: RoutePath.settings,
		element: <SettingsPage />,
		authOnly: true,
		workspaceOnly: true,
		withLayout: true,
	},
	[AppRoutes.PROFILE]: {
		path: RoutePath.profile,
		element: <ProfilePage />,
		authOnly: true,
		withLayout: true,
	},
	// last
	[AppRoutes.NOT_FOUND]: {
		path: RoutePath.not_found,
		element: <NotFoundPage />,
	},
};
