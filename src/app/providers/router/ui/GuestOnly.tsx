import type { JSX } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { getUserAuthData } from "@/entities/User";
import { RoutePath } from "@/shared/const/router";

export function GuestOnly({ children }: { children: JSX.Element }) {
	const auth = useSelector(getUserAuthData);
	const location = useLocation();
	const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
	if (auth) {
		return (
			<Navigate
				to={from && from !== RoutePath.auth ? from : RoutePath.main}
				replace
			/>
		);
	}
	return children;
}
