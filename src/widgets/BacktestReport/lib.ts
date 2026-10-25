/** Доля 0..1 → «12,5%». null — «не определено» (не 0 и не 100%): показываем «н/д» */
export function ratioText(v: number | null | undefined): string {
	if (v === null || v === undefined || !Number.isFinite(v)) return "н/д";
	return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}

export const NA = "н/д";
