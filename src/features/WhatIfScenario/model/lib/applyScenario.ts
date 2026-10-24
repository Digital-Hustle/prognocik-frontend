import type { Dashboard, Forecast } from "@/entities/Forecast";
import { addDays } from "@/shared/lib/date/date";
import { toNumber } from "@/shared/lib/format/money";
import type { WhatIfSchema } from "../types/whatIfSchema";

export interface ScenarioPoint {
	date: string;
	base: number;
	scenario: number;
	delta: number;
}

export interface ScenarioResult {
	points: ScenarioPoint[];
	active: boolean;
	baseMin: { date: string; value: number } | null;
	scenarioMin: { date: string; value: number } | null;
	/** Первый день ниже порога (0 или буфер) в сценарии */
	firstGap: { date: string; shortfall: number } | null;
	baseFirstGap: { date: string; shortfall: number } | null;
	totalImpact: number;
}

const n = (v: string | null | undefined) => toNumber(v) ?? 0;

/**
 * Негативный сценарий поверх серверного прогноза. Берём дневные компоненты ForecastDay (planned/recurring/residual)
 * и считаем поправку к потоку каждого дня; накопленная поправка сдвигает серверный остаток. Сам прогноз и его
 * вероятности не пересчитываются — это оценка влияния, явно подписанная в интерфейсе.
 */
export function applyScenario(
	forecast: Forecast,
	upcoming: Dashboard["upcomingPayments"],
	s: WhatIfSchema
): ScenarioResult {
	const days = forecast.days;
	const threshold = n(forecast.settings?.bufferAmount);
	const delta = new Map<string, number>();
	const add = (date: string, v: number) => delta.set(date, (delta.get(date) ?? 0) + v);

	for (const d of days) {
		if (s.revenueDropPct > 0) add(d.date, -(n(d.recurringIn) + n(d.residualIn)) * (s.revenueDropPct / 100));
		if (s.fixedCostGrowthPct > 0) add(d.date, -n(d.recurringOut) * (s.fixedCostGrowthPct / 100));
	}

	// Задержка оплаты клиента: план учтён в прогнозе только при scope WITH_KNOWN_PLANS
	const plan = upcoming.find((p) => p.id === s.delayedPlanId && p.direction === "IN");
	if (plan && forecast.scope === "WITH_KNOWN_PLANS" && s.delayWeeks > 0) {
		const amount = n(plan.remainingAmount);
		const first = days[0]?.date;
		// Просроченный план сервер ставит на первый день горизонта
		const from = first && plan.dueDate < first ? first : plan.dueDate;
		add(from, -amount);
		add(addDays(from, s.delayWeeks * 7), amount);
	}

	const extra = n(s.extraExpense);
	if (extra > 0 && s.extraExpenseDate) add(s.extraExpenseDate, -extra);

	let cumulative = 0;
	const points = days.map((d) => {
		cumulative += delta.get(d.date) ?? 0;
		const base = n(d.balance);
		return { date: d.date, base, scenario: base + cumulative, delta: cumulative };
	});

	const minOf = (key: "base" | "scenario") =>
		points.reduce<{ date: string; value: number } | null>(
			(m, p) => (!m || p[key] < m.value ? { date: p.date, value: p[key] } : m),
			null
		);
	const gapOf = (key: "base" | "scenario") => {
		const hit = points.find((p) => p[key] < Math.max(0, threshold));
		if (!hit) return null;
		const lowest = points.filter((p) => p.date >= hit.date).reduce((m, p) => Math.min(m, p[key]), hit[key]);
		return { date: hit.date, shortfall: Math.max(0, threshold) - lowest };
	};

	return {
		points,
		active: points.some((p) => Math.abs(p.delta) > 0.004),
		baseMin: minOf("base"),
		scenarioMin: minOf("scenario"),
		firstGap: gapOf("scenario"),
		baseFirstGap: gapOf("base"),
		totalImpact: points.length ? points[points.length - 1].delta : 0,
	};
}
