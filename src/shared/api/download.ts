import { apiFetch } from "./demoTransport";
import type { ApiProblem } from "./problem";

/** Ошибка скачивания в форме, которую понимает problemMessage() */
export class DownloadError extends Error {
	readonly status: number;
	readonly data: Partial<ApiProblem> | null;
	constructor(status: number, data: Partial<ApiProblem> | null) {
		super(`download failed: ${status}`);
		this.status = status;
		this.data = data;
	}
}

/**
 * Скачивание файла с Gateway (cookie уходят сами, CSRF для GET не нужен). Имя берётся из Content-Disposition —
 * Gateway отдаёт заголовок в CORS; если его нет, используем запасное. Тело не логируем: в нём суммы клиента.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<string> {
	let rs: Response;
	try {
		rs = await apiFetch(new URL(`${__API__}${url}`, window.location.origin), { credentials: "include" });
	} catch {
		throw new DownloadError(0, null);
	}
	if (!rs.ok) {
		const data = await rs.json().catch(() => null);
		throw new DownloadError(rs.status, data);
	}
	const disposition = rs.headers.get("Content-Disposition") ?? "";
	const name = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1] ?? /filename="?([^";]+)"?/i.exec(disposition)?.[1];
	const filename = name ? decodeURIComponent(name) : fallbackName;
	const href = URL.createObjectURL(await rs.blob());
	const a = Object.assign(document.createElement("a"), { href, download: filename });
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(href), 1000);
	return filename;
}
