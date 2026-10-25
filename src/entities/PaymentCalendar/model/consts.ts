import type { CalendarWarning } from "./types";

export const CALENDAR_WARNING_LABEL: Record<CalendarWarning, string> = {
	SIMPLIFIED_BUSINESS_CALENDAR:
		"Рабочие дни считаются упрощённо: государственные праздники при переносе не учитываются.",
	RECURRING_SETTLEMENT_UNKNOWN: "По регулярным платежам неизвестно, оплачены ли они: показываем расчётную дату.",
};
