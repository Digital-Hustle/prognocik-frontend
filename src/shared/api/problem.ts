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
	NO_FORECAST: "Прогноза ещё нет. Сначала рассчитайте его.",
	INVALID_SCENARIO: "Проверьте параметры сценария: проценты, дни и суммы.",
	SCENARIO_DATE_OUTSIDE_FORECAST: "Дата должна лежать внутри окна прогноза.",
	PLAN_NOT_IN_FORECAST: "Этот план не попал в прогноз: он вне окна или прогноз построен без планов.",
	EXTERNAL_DOCUMENT_EXISTS: "Этот документ уже загружен.",
	BITRIX_NOT_CONFIGURED: "Вебхук Битрикс24 не настроен. Вставьте адрес входящего вебхука.",
	BITRIX_WEBHOOK_INVALID: "Адрес вебхука не подходит: проверьте ссылку и домен портала.",
	BITRIX_AUTH_FAILED: "Битрикс24 отклонил вебхук. Проверьте права и актуальность ссылки.",
	BITRIX_TOO_MANY_DOCUMENTS: "В Битрикс24 слишком много документов. Сократите горизонт.",
	BITRIX_UNAVAILABLE: "Битрикс24 сейчас недоступен. Попробуйте позже.",
	BITRIX_ERROR: "Битрикс24 вернул ошибку. Попробуйте позже.",
	BITRIX_BAD_RESPONSE: "Битрикс24 ответил непонятно. Попробуйте позже.",
	BITRIX_RATE_LIMITED: "Битрикс24 ограничил частоту запросов. Подождите минуту.",
	BITRIX_TIMEOUT: "Битрикс24 не ответил вовремя. Попробуйте ещё раз.",
	CONCURRENT_SYNC: "Синхронизация уже идёт. Дождитесь её окончания.",
	NOTHING_TO_SYNC: "Включите хотя бы один тип документов: сделки или счета.",
	INVALID_HORIZON: "Горизонт должен быть от 1 до 90 дней.",
	RECURRING_ALREADY_EXISTS:
		"Такая выплата уже есть среди регулярных платежей. Привяжите её к сотруднику, а не создавайте новую.",
	PAYROLL_ALREADY_LINKED:
		"У сотрудника или у этого платежа уже есть другая связь. Сначала отключите прежнюю выплату.",
	EMPLOYEE_ARCHIVED: "Сотрудник в архиве: карточку и выплату изменить нельзя.",
	PAYROLL_DIRECTION: "К сотруднику можно привязать только списание (расход).",
	PAYROLL_IDENTITY_CHANGED:
		"Получатель, счёт и категория связанной зарплаты не меняются. Отключите выплату и создайте новую.",
	PATTERN_VERSION_REQUIRED: "Данные выплаты устарели. Обновите страницу.",
	COUNTERPARTY_REQUIRED: "Укажите ИНН или имя получателя как в банковских операциях.",
	INVALID_SCHEDULE: "Проверьте расписание выплаты.",
	INVALID_AMOUNT: "Сумма должна быть больше нуля, не больше двух знаков после запятой.",
	INVALID_RANGE: "Период указан неверно: не более 366 дней.",
	INVALID_CATEGORY: "Такой категории нет.",
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
