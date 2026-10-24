/** Вероятность приходит в долях (0.3). В проценты переводим только при показе. null — «нет данных», не 0%. */
export function formatProbability(value: number | null | undefined, fallback = "—"): string {
	if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
	const pct = value * 100;
	if (pct > 0 && pct < 1) return "<1%";
	if (pct < 100 && pct > 99) return ">99%";
	return `${Math.round(pct)}%`;
}

export function formatRatio(value: number | null | undefined, fallback = "—"): string {
	if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
	return `${Math.round(value * 100)}%`;
}
