// Даты бэка — ISO "YYYY-MM-DD" без времени. Работаем с ними как с локальными календарными днями,
// чтобы не ловить сдвиг часового пояса.

export type IsoDate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toIsoDate(d: Date): IsoDate {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDate(iso: IsoDate): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayIso(): IsoDate {
	return toIsoDate(new Date());
}

export function addDays(iso: IsoDate, days: number): IsoDate {
	const d = parseIsoDate(iso);
	d.setDate(d.getDate() + days);
	return toIsoDate(d);
}

export function diffDays(from: IsoDate, to: IsoDate): number {
	const a = parseIsoDate(from).getTime();
	const b = parseIsoDate(to).getTime();
	return Math.round((b - a) / 86_400_000);
}

const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const dayMonthLong = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const full = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short" });
const dateTime = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
});

/** «12 нояб.» */
export function formatDayShort(iso: IsoDate | null | undefined, fallback = "—"): string {
	return iso ? dayMonth.format(parseIsoDate(iso)).replace(".", "") : fallback;
}

/** «12 ноября» */
export function formatDay(iso: IsoDate | null | undefined, fallback = "—"): string {
	return iso ? dayMonthLong.format(parseIsoDate(iso)) : fallback;
}

/** «12 ноября 2026 г.» */
export function formatDayFull(iso: IsoDate | null | undefined, fallback = "—"): string {
	return iso ? full.format(parseIsoDate(iso)) : fallback;
}

/** «пт, 12 нояб.» */
export function formatWeekday(iso: IsoDate | null | undefined, fallback = "—"): string {
	return iso ? weekday.format(parseIsoDate(iso)) : fallback;
}

/** Instant (ISO с временем) → «12 нояб., 14:05» */
export function formatInstant(instant: string | null | undefined, fallback = "—"): string {
	if (!instant) return fallback;
	const d = new Date(instant);
	return Number.isNaN(d.getTime()) ? fallback : dateTime.format(d);
}

/** «через 3 дня» / «сегодня» / «2 дня назад» */
export function formatRelativeDays(iso: IsoDate, base: IsoDate = todayIso()): string {
	const n = diffDays(base, iso);
	if (n === 0) return "сегодня";
	if (n === 1) return "завтра";
	if (n === -1) return "вчера";
	const rtf = new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" });
	return rtf.format(n, "day");
}

const WEEKDAYS = ["", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

/** ISO-номер дня недели (1 = пн) → название */
export function weekdayName(isoWeekday: number | null | undefined): string {
	return isoWeekday ? (WEEKDAYS[isoWeekday] ?? "—") : "—";
}
