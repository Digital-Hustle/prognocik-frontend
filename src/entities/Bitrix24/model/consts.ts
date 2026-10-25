import type { Tone } from "@/shared/ui/Status/Status";
import type { BitrixAction } from "./types";

export const BITRIX_ACTION: Record<BitrixAction, { label: string; tone: Tone }> = {
	CREATED: { label: "Создан план", tone: "success" },
	REOPENED: { label: "Возобновлён", tone: "success" },
	UPDATED: { label: "Обновлён", tone: "info" },
	UNCHANGED: { label: "Без изменений", tone: "neutral" },
	SKIPPED: { label: "Пропущен", tone: "neutral" },
	CANCELLED: { label: "Аннулирован", tone: "danger" },
};

/** Причины пропуска и аннулирования (BitrixSyncPlanner) */
export const BITRIX_REASON: Record<string, string> = {
	WON: "Сделка выиграна — деньги уже должны быть в выписке",
	LOST: "Сделка проиграна",
	CURRENCY_NOT_RUB: "Валюта не рубль",
	NO_AMOUNT: "Нет суммы",
	NO_DUE_DATE: "Нет срока оплаты",
	OUT_OF_HORIZON: "За пределами горизонта",
	NOT_IN_BITRIX: "Документ пропал из Битрикс24",
	OTHER_ACCOUNT: "Документ привязан к другому счёту",
	AMOUNT_BELOW_SETTLED: "Новая сумма меньше уже оплаченной",
	EXTERNAL_ID_TOO_LONG: "Слишком длинный внешний номер",
	OTHER: "Другая причина",
};

export const bitrixReason = (code: string | null) => (code ? (BITRIX_REASON[code] ?? code) : "");

export const BITRIX_KIND_LABEL = { DEAL: "Сделка", INVOICE: "Счёт" } as const;
export const BITRIX_HORIZONS = [7, 14, 30, 60, 90] as const;
