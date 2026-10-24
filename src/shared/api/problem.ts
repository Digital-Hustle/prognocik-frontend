// Ошибки бэка — application/problem+json. Ветвимся по `code`, показываем `detail` (бэк пишет его по-русски).
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

export interface ApiFieldError {
	field: string;
	code?: string;
	message: string;
}

export interface ApiProblem {
	status: number;
	code: string | null;
	title: string | null;
	detail: string | null;
	traceId: string | null;
	resourceId: string | null;
	retryAfterSec: number | null;
	errors: ApiFieldError[];
}

const STATUS_MESSAGES: Record<number, string> = {
	0: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.",
	400: "Сервер не принял запрос.",
	401: "Сессия закончилась. Войдите снова.",
	403: "Недостаточно прав для этого действия.",
	404: "Не найдено или нет доступа.",
	409: "Данные изменились, пока вы их редактировали. Обновите и повторите.",
	413: "Файл слишком большой.",
	422: "Данные не прошли проверку.",
	429: "Слишком много запросов. Подождите немного.",
	500: "Ошибка на сервере. Попробуйте позже.",
	502: "Сервис временно недоступен.",
	503: "Сервис временно недоступен. Попробуйте позже.",
};

/** Понятные тексты для известных кодов, когда detail пустой */
const CODE_MESSAGES: Record<string, string> = {
	CSRF_INVALID: "Сессия безопасности устарела. Повторите действие.",
	CODE_INVALID: "Неверный код. Проверьте и введите ещё раз.",
	CODE_EXPIRED: "Код истёк. Запросите новый.",
	CODE_ATTEMPTS_EXCEEDED: "Слишком много попыток. Запросите новый код.",
	RATE_LIMITED: "Слишком часто. Подождите немного.",
	VERSION_CONFLICT: "Кто-то уже изменил эти данные. Мы обновили их — проверьте и повторите.",
	PROFILE_VERSION_CONFLICT: "Профиль изменён в другом окне. Обновите страницу.",
	IDEMPOTENCY_KEY_REUSED: "Этот запрос уже отправлялся с другими данными.",
	CONCURRENT_REQUEST: "Такой запрос уже выполняется.",
	DEPENDENCY_UNAVAILABLE: "Сервис расчёта временно недоступен.",
};

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

export function toProblem(error: FetchBaseQueryError | SerializedError | undefined | unknown): ApiProblem {
	const base: ApiProblem = {
		status: 0,
		code: null,
		title: null,
		detail: null,
		traceId: null,
		resourceId: null,
		retryAfterSec: null,
		errors: [],
	};
	if (!isRecord(error)) return base;

	const status = error.status;
	if (typeof status === "number") base.status = status;
	else if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") base.status = 0;
	else if (status === "PARSING_ERROR" && typeof error.originalStatus === "number") base.status = error.originalStatus;

	const data = error.data;
	if (isRecord(data)) {
		base.code = typeof data.code === "string" ? data.code : null;
		base.title = typeof data.title === "string" ? data.title : null;
		base.detail = typeof data.detail === "string" ? data.detail : null;
		base.traceId = typeof data.traceId === "string" ? data.traceId : null;
		base.resourceId = typeof data.resourceId === "string" ? data.resourceId : null;
		base.retryAfterSec = typeof data.retryAfterSec === "number" ? data.retryAfterSec : null;
		if (Array.isArray(data.errors)) {
			base.errors = data.errors.filter(isRecord).map((e) => ({
				field: String(e.field ?? ""),
				code: typeof e.code === "string" ? e.code : undefined,
				message: String(e.message ?? e.defaultMessage ?? ""),
			}));
		}
	}
	return base;
}

/** Текст ошибки для пользователя */
export function problemMessage(error: unknown, fallback?: string): string {
	const p = toProblem(error);
	if (p.detail) return p.detail;
	if (p.code && CODE_MESSAGES[p.code]) return CODE_MESSAGES[p.code];
	if (p.errors.length) return p.errors.map((e) => e.message).join("; ");
	return fallback ?? STATUS_MESSAGES[p.status] ?? "Что-то пошло не так.";
}

export function isProblemCode(error: unknown, code: string): boolean {
	return toProblem(error).code === code;
}
