import { createAction } from "@reduxjs/toolkit";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { csrfHeader, ensureCsrf, resetCsrf } from "./csrf";
import { apiFetch, isDemoRequest } from "./demoTransport";
import { toProblem } from "./problem";

/**
 * Единый клиент Gateway.
 * - Токены — HttpOnly cookies (credentials: "include"), в JS их нет.
 * - Изменяющие методы получают X-CSRF-Token; при CSRF_INVALID токен перезапрашивается и запрос повторяется один раз
 *   (отказ по CSRF значит, что сервер действие не выполнил).
 * - 401 на безопасном GET → один refresh и один повтор чтения. Изменяющие запросы автоматически не повторяем.
 */

export const REFRESH_URL = "/api/v1/auth-profile/auth/refresh";

/** Сессия закончилась и не обновилась — слушает entities/User */
export const sessionExpired = createAction("api/sessionExpired");

const rawBaseQuery = fetchBaseQuery({
	baseUrl: __API__,
	fetchFn: apiFetch,
	credentials: "include",
	prepareHeaders: (headers) => {
		if (!headers.has("Accept")) headers.set("Accept", "application/json");
		return headers;
	},
});

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
	if (!refreshing) {
		refreshing = (async () => {
			try {
				await ensureCsrf();
				const csrf = csrfHeader();
				const rs = await fetch(`${__API__}${REFRESH_URL}`, {
					method: "POST",
					credentials: "include",
					headers: csrf ? { [csrf.name]: csrf.value } : {},
				});
				resetCsrf();
				return rs.ok;
			} catch {
				return false;
			} finally {
				setTimeout(() => {
					refreshing = null;
				}, 0);
			}
		})();
	}
	return refreshing;
}

function withCsrf(args: FetchArgs): FetchArgs {
	const csrf = csrfHeader();
	if (!csrf) return args;
	const headers = new Headers(args.headers as HeadersInit | undefined);
	headers.set(csrf.name, csrf.value);
	return { ...args, headers };
}

export const gatewayBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
	args,
	api,
	extra
) => {
	const request: FetchArgs = typeof args === "string" ? { url: args } : args;
	const method = (request.method ?? "GET").toUpperCase();
	const mutating = !SAFE.has(method);
	if (isDemoRequest(request.url)) return rawBaseQuery(request, api, extra);

	if (mutating) {
		try {
			await ensureCsrf();
		} catch {
			return { error: { status: "FETCH_ERROR", error: "CSRF unavailable" } };
		}
	}

	let result = await rawBaseQuery(mutating ? withCsrf(request) : request, api, extra);

	if (result.error && mutating && result.error.status === 403 && toProblem(result.error).code === "CSRF_INVALID") {
		await ensureCsrf(true).catch(() => undefined);
		result = await rawBaseQuery(withCsrf(request), api, extra);
	}

	const isRefreshCall = request.url.includes(REFRESH_URL);
	if (result.error && result.error.status === 401 && !isRefreshCall) {
		if (!mutating && (await refreshSession())) {
			result = await rawBaseQuery(request, api, extra);
		}
		if (result.error && result.error.status === 401) {
			api.dispatch(sessionExpired());
		}
	}

	return result;
};

export const TAGS = [
	"Profile",
	"Sessions",
	"Companies",
	"Accounts",
	"Members",
	"Dashboard",
	"Forecasts",
	"Backtests",
	"Jobs",
	"Alerts",
	"Payments",
	"Categories",
	"Counterparties",
	"Imports",
	"DailyHistory",
	"DataQuality",
	"Completeness",
	"Recurring",
	"Plans",
	"Allocations",
	"PlanFact",
	"Settings",
	"Analytics",
] as const;

export const rtkApi = createApi({
	reducerPath: "api",
	baseQuery: gatewayBaseQuery,
	tagTypes: TAGS,
	refetchOnReconnect: true,
	endpoints: () => ({}),
});

/** Заголовок If-Match: версия в кавычках */
export const ifMatch = (version: number | string) => ({ "If-Match": `"${version}"` });

/** Заголовок Idempotency-Key */
export const idempotency = (key: string) => ({ "Idempotency-Key": key });

/** URL orchestrator */
export const orch = (path: string) => `/api/v1/orchestrator${path}`;
export const companyUrl = (companyId: string, path = "") => orch(`/companies/${companyId}${path}`);
export const accountUrl = (companyId: string, accountId: string, path = "") =>
	companyUrl(companyId, `/accounts/${accountId}${path}`);
