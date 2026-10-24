import type { DailyActual } from "@/entities/AccountHistory";
import type { Forecast } from "@/entities/Forecast";
import { toNumber } from "@/shared/lib/format/money";

export interface ChartRow {
	date: string;
	/** Факт: остаток на конец дня. null — день MISSING (разрыв линии, не ноль) */
	actual?: number | null;
	/** Прогноз остатка (точечный, не медиана) */
	forecast?: number | null;
	/** Диапазон P10–P90 */
	band?: [number, number] | null;
	/** Негативный сценарий «что если» */
	scenario?: number | null;
}

/**
 * Склеиваем по дате, но не в один ряд: факт и прогноз — разные серии, граница — asOfDate (CLIENT_HANDOFF).
 * Прогноз стартует от подтверждённого стартового остатка, чтобы линии визуально стыковались.
 */
export function buildSeries(
	history: DailyActual[] | undefined,
	forecast: Forecast | null | undefined,
	scenario?: { date: string; scenario: number }[] | null
): ChartRow[] {
	const rows = new Map<string, ChartRow>();
	const row = (date: string) => {
		let r = rows.get(date);
		if (!r) {
			r = { date };
			rows.set(date, r);
		}
		return r;
	};

	history?.forEach((d) => {
		row(d.date).actual = d.status === "MISSING" ? null : toNumber(d.balanceEod);
	});

	if (forecast) {
		const start = toNumber(forecast.startBalance);
		if (start !== null) {
			const r = row(forecast.asOfDate);
			r.forecast = start;
			r.band = [start, start];
			if (scenario?.length) r.scenario = start;
		}
		forecast.days.forEach((d) => {
			const r = row(d.date);
			r.forecast = toNumber(d.balance);
			const lo = toNumber(d.balanceP10);
			const hi = toNumber(d.balanceP90);
			r.band = lo !== null && hi !== null ? [lo, hi] : null;
		});
	}

	scenario?.forEach((p) => {
		row(p.date).scenario = p.scenario;
	});

	return [...rows.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
