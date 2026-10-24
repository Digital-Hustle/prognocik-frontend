import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspace } from "@/entities/Workspace";
import { RoutePath } from "@/shared/const/router";

/** Финансовые экраны — только с выбранными компанией и счётом */
export function RequireWorkspace({ children }: { children: JSX.Element }) {
	const { ready } = useWorkspace();
	if (!ready) {
		return (
			<Navigate
				to={RoutePath.onboarding}
				replace
			/>
		);
	}
	return children;
}
