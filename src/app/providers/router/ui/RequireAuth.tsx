import { useEffect } from "react";
import type { JSX } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { getUserAuthData } from "@/entities/User";
import { workspaceActions } from "@/entities/Workspace";
import { RoutePath } from "@/shared/const/router";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";

export function RequireAuth({ children }: { children: JSX.Element }) {
	const auth = useSelector(getUserAuthData);
	const location = useLocation();
	const dispatch = useAppDispatch();
	const userId = auth?.id;

	// Вошёл другой пользователь — выбранные компания и счёт предыдущего ему не принадлежат (иначе 404 на прогнозе)
	useEffect(() => {
		if (userId) dispatch(workspaceActions.bindOwner(userId));
	}, [dispatch, userId]);

	if (!auth) {
		return (
			<Navigate
				to={RoutePath.auth}
				state={{ from: location }}
				replace
			/>
		);
	}

	return children;
}
