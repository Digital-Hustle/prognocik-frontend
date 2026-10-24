import { memo, Suspense, useCallback } from "react";
import { Route, Routes } from "react-router-dom";
import type { AppRoutesProps } from "@/shared/types/router";
import { PageLoader } from "@/widgets/PageLoader";
import { AppLayout } from "./AppLayout";
import { GuestOnly } from "./GuestOnly";
import { RequireAuth } from "./RequireAuth";
import { RequireWorkspace } from "./RequireWorkspace";
import { routeConfig } from "../config/routeConfig";

const AppRouter = () => {
	const renderWithWrapper = useCallback((route: AppRoutesProps) => {
		let element = <Suspense fallback={<PageLoader />}>{route.element}</Suspense>;

		if (route.workspaceOnly) element = <RequireWorkspace>{element}</RequireWorkspace>;
		if (route.withLayout) element = <AppLayout>{element}</AppLayout>;
		if (route.authOnly) element = <RequireAuth>{element}</RequireAuth>;
		if (route.guestOnly) element = <GuestOnly>{element}</GuestOnly>;

		return (
			<Route
				key={route.path}
				path={route.path}
				element={element}
			/>
		);
	}, []);

	return <Routes>{Object.values(routeConfig).map(renderWithWrapper)}</Routes>;
};

export default memo(AppRouter);
