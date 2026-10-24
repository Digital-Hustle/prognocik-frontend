import type { Tone } from "@/shared/ui/Status/Status";
import type { PlanRelation, PlanSource, PlanStatus } from "./types";

export const PLAN_STATUS_LABEL: Record<PlanStatus, { label: string; tone: Tone }> = {
	OPEN: { label: "Ожидается", tone: "info" },
	PARTIALLY_SETTLED: { label: "Частично оплачен", tone: "warning" },
	SETTLED: { label: "Исполнен", tone: "success" },
	CANCELLED: { label: "Отменён", tone: "neutral" },
};

export const PLAN_RELATION_LABEL: Record<PlanRelation, { label: string; hint: string }> = {
	ADDITIONAL: {
		label: "Дополнительный",
		hint: "Разовая операция сверх обычных потоков — не дублирует регулярные платежи.",
	},
	REPLACES_RECURRING: {
		label: "Вместо регулярного",
		hint: "Заменяет конкретную подтверждённую регулярность, чтобы не посчитать её дважды.",
	},
	REPLACES_BASELINE: {
		label: "Вместо обычного потока",
		hint: "Базовые потоки этого контрагента и направления на весь горизонт заменятся открытыми планами.",
	},
};

export const PLAN_SOURCE_LABEL: Record<PlanSource, string> = {
	MANUAL: "Вручную",
	INVOICE: "Счёт",
	TAX: "Налог",
	CONTRACT: "Договор",
};
