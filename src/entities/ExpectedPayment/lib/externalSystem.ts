import type { Tone } from "@/shared/ui/Status/Status";
import type { SourceDocument } from "../model/types";

export const BITRIX_SYSTEM = "BITRIX24";

const KNOWN: Record<string, { label: string; tone: Tone }> = {
	[BITRIX_SYSTEM]: { label: "Битрикс24", tone: "info" },
	"1C": { label: "1С", tone: "warning" },
	"1C_DEMO": { label: "1С · демо", tone: "warning" },
};

/** Подпись и цвет источника документа; неизвестную систему показываем как есть, без догадок */
export function describeExternalSystem(system: string): { label: string; tone: Tone } {
	return KNOWN[system] ?? { label: system, tone: "neutral" };
}

/** План приходит из Битрикс24: синхронизация перезапишет ручные правки и переоткроет отменённый план */
export const isBitrixPlan = (doc: SourceDocument | null | undefined) => doc?.externalSystem === BITRIX_SYSTEM;
