import type { Instant, IsoDate, Money, Uuid } from "@/shared/api/types";

export interface HorizonMetric {
	horizonDay: number;
	maeBalance: Money | null;
	rmseBalance: Money | null;
	evaluatedCount: number;
}

export interface GapMetrics {
	truePositive: number;
	falsePositive: number;
	falseNegative: number;
	precision: number | null;
	recall: number | null;
	medianLeadDays: number | null;
	dateMaeDays: number | null;
	shortfallMae: Money | null;
}

export interface CalibrationBin {
	fromProbability: number;
	toProbability: number;
	count: number;
	meanProbability: number | null;
	observedRate: number | null;
}

export interface RiskMetrics {
	brierScore: number | null;
	evaluatedCount: number;
	calibrationBins: CalibrationBin[];
	interval80Coverage: number | null;
}

/** BacktestOriginRs: одна отсечка временной кросс-валидации */
export interface BacktestOrigin {
	asOfDate: IsoDate;
	status: "EVALUATED" | "SKIPPED" | (string & {});
	reason: string | null;
	maeBalance: Money | null;
	evaluatedDays: number;
}

/** BacktestRs */
export interface Backtest {
	id: Uuid;
	companyId: Uuid;
	accountId: Uuid;
	jobId: Uuid;
	status: string;
	algorithm: string;
	algorithmVersion: string;
	scope: "HISTORY_ONLY" | "WITH_KNOWN_PLANS";
	windowWeeks: number;
	firstOrigin: IsoDate;
	lastOrigin: IsoDate;
	stepDays: number;
	snapshotId: Uuid;
	inputDataVersion: number;
	staleness: "CURRENT" | "STALE";
	evaluatedOrigins: number;
	skippedOrigins: number;
	evaluatedDays: number;
	maeBalance: Money | null;
	rmseBalance: Money | null;
	horizons: HorizonMetric[];
	gapMetrics: GapMetrics | null;
	riskMetrics: RiskMetrics | null;
	origins: BacktestOrigin[] | null;
	warnings: { code: string; message: string; date: IsoDate | null }[];
	createdAt: Instant;
}
