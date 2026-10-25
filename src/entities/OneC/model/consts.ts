import type { Tone } from "@/shared/ui/Status/Status";
import type { OneCAction } from "./types";

export const ONEC_ACTION: Record<OneCAction, { label: string; tone: Tone }> = {
	CREATED: { label: "Создан план", tone: "success" },
	UPDATED: { label: "Срок сдвинут", tone: "info" },
	UNCHANGED: { label: "Без изменений", tone: "neutral" },
	SKIPPED: { label: "Пропущен", tone: "neutral" },
};

/** Причины пропуска из контракта (раздел 6.2) */
export const ONEC_REASON: Record<string, string> = {
	CANCELLED: "План отменён вручную",
	ALREADY_PAID: "План уже частично оплачен",
	OTHER_ACCOUNT: "Документ уже загружен в другой счёт компании",
};

export const oneCReason = (code: string | null) => (code ? (ONEC_REASON[code] ?? code) : "");
