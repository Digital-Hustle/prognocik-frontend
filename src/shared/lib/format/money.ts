// Деньги приходят с бэка строкой с двумя знаками ("12345.60"). Не превращаем их в number там,
// где нужно хранить или отправлять — только для отображения и графиков.

const rub = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
const rubExact = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export type MoneyLike = string | number | null | undefined;

/** Строка денег → число. null/пусто → null (не ноль!). */
export function toNumber(value: MoneyLike): number | null {
	if (value === null || value === undefined || value === "") return null;
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

/** «1 234 567 ₽» */
export function formatMoney(value: MoneyLike, fallback = "—"): string {
	const n = toNumber(value);
	return n === null ? fallback : rub.format(n);
}

/** «1 234 567,89 ₽» */
export function formatMoneyExact(value: MoneyLike, fallback = "—"): string {
	const n = toNumber(value);
	return n === null ? fallback : rubExact.format(n);
}

/** «1,2 млн» — для осей графиков */
export function formatCompact(value: MoneyLike, fallback = "—"): string {
	const n = toNumber(value);
	return n === null ? fallback : compact.format(n);
}

/** «1 234 567» без валюты */
export function formatPlain(value: MoneyLike, fallback = "—"): string {
	const n = toNumber(value);
	return n === null ? fallback : plain.format(n);
}

/** Со знаком: «+12 000 ₽» / «−3 400 ₽» */
export function formatSigned(value: MoneyLike, fallback = "—"): string {
	const n = toNumber(value);
	if (n === null) return fallback;
	const sign = n > 0 ? "+" : n < 0 ? "−" : "";
	return `${sign}${rub.format(Math.abs(n))}`;
}

/** Деньги для отправки на бэк: строка с двумя знаками */
export function toMoneyString(value: number): string {
	return (Math.round(value * 100) / 100).toFixed(2);
}
