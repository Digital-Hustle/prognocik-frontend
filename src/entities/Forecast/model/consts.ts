import type { Tone } from "@/shared/ui/Status/Status";
import type { DataQuality, ForecastScope, RiskAvailability } from "./types";

export const QUALITY_LABEL: Record<DataQuality, { label: string; tone: Tone; hint: string }> = {
	GOOD: {
		label: "Данных достаточно",
		tone: "success",
		hint: "История полная — прогноз опирается на все дни недели.",
	},
	LIMITED: { label: "Есть пропуски", tone: "warning", hint: "В истории есть дни без данных — прогноз менее точен." },
	INSUFFICIENT: {
		label: "Мало данных",
		tone: "danger",
		hint: "Не по всем дням недели есть наблюдения — загрузите выписку за более длинный период.",
	},
};

export const SCOPE_LABEL: Record<ForecastScope, string> = {
	HISTORY_ONLY: "Только история",
	WITH_KNOWN_PLANS: "История + планы",
};

export const RISK_UNAVAILABLE_LABEL: Record<RiskAvailability, string> = {
	AVAILABLE: "",
	INSUFFICIENT_HISTORY: "Недостаточно истории для вероятности",
	INPUT_INCOMPLETE: "Входные данные неполные — вероятность не считается",
};
