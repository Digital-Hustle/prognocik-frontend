import { toNumber } from "@/shared/lib/format/money";
import type { ScenarioChange, ScenarioPreview } from "../types/scenario";
import type { WhatIfSchema } from "../types/whatIfSchema";

export interface ScenarioPoint {
	date: string;
	base: number;
	scenario: number;
	delta: number;
}

/** То, что нужно графику и сводке: точки двух линий и главные цифры из серверного сравнения */
export interface ScenarioResult {
	points: ScenarioPoint[];
	firstGap: { date: string; balance: number | null; shortfall: number; shortfallDate: string | null } | null;
	baseFirstGapDate: string | null;
	newGap: boolean;
	gapEarlier: boolean;
	gapShiftDays: number | null;
	additionalShortfall: number;
	firstBufferBreachDate: string | null;
	totalImpact: number;
	endDate: string | null;
}

const n = (v: string | null | undefined) => toNumber(v) ?? 0;

export function toScenarioResult(rs: ScenarioPreview): ScenarioResult {
	const s = rs.comparison.scenario;
	const points = rs.days.map((d) => ({
		date: d.date,
		base: n(d.baseBalance),
		scenario: n(d.scenarioBalance),
		delta: n(d.delta),
	}));
	return {
		points,
		firstGap: s.firstGapDate
			? {
					date: s.firstGapDate,
					balance: s.balanceOnFirstGapDate === null ? null : n(s.balanceOnFirstGapDate),
					shortfall: n(s.maxShortfall),
					shortfallDate: s.maxShortfallDate,
				}
			: null,
		baseFirstGapDate: rs.comparison.base.firstGapDate,
		newGap: rs.comparison.newGap,
		gapEarlier: rs.comparison.gapEarlier,
		gapShiftDays: rs.comparison.gapShiftDays,
		additionalShortfall: n(rs.comparison.additionalShortfall),
		firstBufferBreachDate: s.firstBufferBreachDate,
		totalImpact: points.length ? points[points.length - 1].delta : 0,
		endDate: points.length ? points[points.length - 1].date : null,
	};
}

/** Сумма из поля ввода → «100000.00» или null, если не число больше нуля */
export function normalizeAmount(raw: string): string | null {
	const v = Number(raw.replace(/\s/g, "").replace(",", "."));
	return Number.isFinite(v) && v > 0 ? v.toFixed(2) : null;
}

/** Включённые рычаги → список для API. Пустой список = сценарий не задан */
export function buildChanges(s: WhatIfSchema): ScenarioChange[] {
	const out: ScenarioChange[] = [];
	if (s.delayReceiptPlanId)
		out.push({ type: "DELAY_RECEIPT", planId: s.delayReceiptPlanId, delayDays: s.delayReceiptDays });
	if (s.cancelPlanId) out.push({ type: "CANCEL_PLAN", planId: s.cancelPlanId });
	if (s.delayPaymentPlanId)
		out.push({ type: "DELAY_PAYMENT", planId: s.delayPaymentPlanId, delayDays: s.delayPaymentDays });
	if (s.revenueDropPct > 0) out.push({ type: "REVENUE_DROP", percent: s.revenueDropPct });
	if (s.costGrowthPct > 0) out.push({ type: "FIXED_COSTS_GROWTH", percent: s.costGrowthPct, target: s.costTarget });
	const expense = normalizeAmount(s.extraExpense);
	if (expense && s.extraExpenseDate)
		out.push({ type: "UNPLANNED_EXPENSE", amount: expense, date: s.extraExpenseDate });
	const income = normalizeAmount(s.extraIncome);
	if (income && s.extraIncomeDate) out.push({ type: "UNPLANNED_INCOME", amount: income, date: s.extraIncomeDate });
	return out;
}
