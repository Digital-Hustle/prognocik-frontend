import type { IsoDate, Money, Uuid } from "@/shared/api/types";

/** Рычаги негативного сценария (раздел 8.1 гайда). Ничего не сохраняется: расчёт идёт поверх готового прогноза */
export type ScenarioChange =
	| { type: "DELAY_RECEIPT" | "DELAY_PAYMENT"; planId: Uuid; delayDays: number }
	| { type: "CANCEL_PLAN"; planId: Uuid }
	| { type: "REVENUE_DROP"; percent: number; fromDate?: IsoDate }
	| { type: "UNPLANNED_EXPENSE" | "UNPLANNED_INCOME"; amount: Money; date: IsoDate; title?: string }
	| { type: "FIXED_COSTS_GROWTH"; percent: number; fromDate?: IsoDate; target?: "RECURRING" | "ALL_OUTFLOWS" };

export interface ScenarioPreviewRq {
	forecastId: Uuid | null;
	changes: ScenarioChange[];
}

export interface ScenarioMetrics {
	minimumBalance: Money;
	minimumBalanceDate: IsoDate;
	endBalance: Money;
	firstGapDate: IsoDate | null;
	balanceOnFirstGapDate: Money | null;
	maxShortfall: Money;
	maxShortfallDate: IsoDate | null;
	daysBelowZero: number;
	firstBufferBreachDate: IsoDate | null;
}

export interface ScenarioDay {
	date: IsoDate;
	baseBalance: Money;
	scenarioBalance: Money;
	delta: Money;
	baseInflow: Money;
	scenarioInflow: Money;
	baseOutflow: Money;
	scenarioOutflow: Money;
	scenarioBalanceP10: Money | null;
	scenarioBalanceP50: Money | null;
	scenarioBalanceP90: Money | null;
}

export interface ScenarioChangeEffect {
	type: ScenarioChange["type"];
	title: string | null;
	planId: Uuid | null;
	amount: Money | null;
	date: IsoDate | null;
	delayDays: number | null;
	movedAmount: Money | null;
	droppedAmount: Money | null;
	movedTo: IsoDate | null;
	endBalanceDelta: Money;
	minimumBalanceDelta: Money;
	note: string | null;
}

export interface ScenarioBaseForecast {
	id: Uuid;
	asOfDate: IsoDate;
	scope: string;
	staleness: "CURRENT" | "STALE";
}

export interface ScenarioPreview {
	baseForecast: ScenarioBaseForecast & { createdAt: string; startBalance: Money | null; bufferAmount: Money };
	comparison: {
		base: ScenarioMetrics;
		scenario: ScenarioMetrics;
		newGap: boolean;
		gapEarlier: boolean;
		additionalShortfall: Money;
		gapShiftDays: number | null;
	};
	days: ScenarioDay[];
	changes: ScenarioChangeEffect[];
	notes: string[];
}

export interface MaxPaymentRq {
	forecastId: Uuid | null;
	date: IsoDate;
	keepBuffer: boolean;
	changes?: ScenarioChange[];
}

export interface MaxPaymentSide {
	maxAmount: Money;
	limitingDate: IsoDate | null;
	limitingBalance: Money | null;
}

export interface MaxPayment {
	baseForecast: ScenarioBaseForecast;
	date: IsoDate;
	keepBuffer: boolean;
	floor: Money;
	base: MaxPaymentSide;
	scenario: MaxPaymentSide;
	changes: ScenarioChangeEffect[];
	notes: string[];
}
