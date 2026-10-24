import type { Tone } from "@/shared/ui/Status/Status";

export const IMPORT_STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
	RECEIVING: { label: "Загружается", tone: "info" },
	STAGING: { label: "Проверяется", tone: "info" },
	COMMITTED: { label: "Сохранена", tone: "success" },
	PARTIAL: { label: "Частично", tone: "warning" },
	REJECTED: { label: "Отклонена", tone: "danger" },
	ABORTED: { label: "Отменена", tone: "neutral" },
};
