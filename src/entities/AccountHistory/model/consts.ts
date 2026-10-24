import type { Tone } from "@/shared/ui/Status/Status";
import type { DailyStatus } from "./types";

export const DAILY_STATUS_LABEL: Record<DailyStatus, { label: string; tone: Tone }> = {
	OBSERVED: { label: "Есть данные", tone: "success" },
	ZERO_CONFIRMED: { label: "Подтверждён пустым", tone: "info" },
	MISSING: { label: "Нет данных", tone: "warning" },
};
