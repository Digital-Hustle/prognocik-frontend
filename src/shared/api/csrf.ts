// CSRF: Gateway требует X-CSRF-Token на POST/PUT/PATCH/DELETE. Токен берём из GET /auth/csrf и держим в памяти
// (не в localStorage). После verify/refresh/logout сервер выдаёт новые cookies — токен сбрасываем.

const CSRF_URL = "/api/v1/auth-profile/auth/csrf";

let token: string | null = null;
let headerName = "X-CSRF-Token";
let pending: Promise<void> | null = null;

export function csrfHeader(): { name: string; value: string } | null {
	return token ? { name: headerName, value: token } : null;
}

export function resetCsrf(): void {
	token = null;
}

export async function ensureCsrf(force = false): Promise<void> {
	if (token && !force) return;
	if (!pending) {
		pending = fetch(`${__API__}${CSRF_URL}`, { credentials: "include", headers: { Accept: "application/json" } })
			.then(async (rs) => {
				if (!rs.ok) throw new Error(`CSRF ${rs.status}`);
				const body = (await rs.json()) as { token?: string; headerName?: string };
				token = body.token ?? null;
				headerName = body.headerName || "X-CSRF-Token";
			})
			.finally(() => {
				pending = null;
			});
	}
	return pending;
}
