import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { userActions } from "@/entities/User";
import { rtkApi } from "@/shared/api/rtkApi";
import { RoutePath } from "@/shared/const/router";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { useLogoutMutation } from "../api/logoutApi";

/** Выход: сервер чистит cookies, клиент — кэш запросов (приватные данные не должны остаться в памяти) */
export function useLogout() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [logout, state] = useLogoutMutation();

	const run = useCallback(async () => {
		await logout();
		dispatch(userActions.logout());
		dispatch(rtkApi.util.resetApiState());
		navigate(RoutePath.auth, { replace: true });
	}, [dispatch, logout, navigate]);

	return { logout: run, isLoading: state.isLoading };
}
