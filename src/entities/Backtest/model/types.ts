import type { Instant, IsoDate, Money, TraceStep, Uuid } from "@/shared/api/types";

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
	f1?: number | null;
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

/** DayComparisonRs: прогноз против факта в один день отсечки */
export interface DayComparison {
	date: IsoDate;
	horizonDay: number;
	forecastBalance: Money;
	actualBalance: Money;
	forecastInflow: Money;
	forecastOutflow: Money;
	actualInflow: Money;
	actualOutflow: Money;
	balanceP10: Money | null;
	balanceP90: Money | null;
	pBelowZero: number | null;
	predictedBreach: boolean;
	actualBreach: boolean;
}

/** Матрица ошибок 2×2. Доли — от 0 до 1; null — «не определено» (не 0 и не 100%) */
export interface ConfusionMatrix {
	threshold: Money;
	truePositive: number;
	falsePositive: number;
	falseNegative: number;
	trueNegative: number;
	total: number;
	accuracy: number | null;
	precision: number | null;
	recall: number | null;
	specificity: number | null;
	f1: number | null;
	balancedAccuracy: number | null;
	prevalence: number | null;
	majorityBaselineAccuracy: number | null;
}

/** ModelScoreRs: метрики одной модели на одних и тех же днях */
export interface ModelScore {
	model: string;
	description: string;
	evaluatedDays: number;
	maeBalance: Money;
	mseBalance: Money;
	rmseBalance: Money;
	wapeBalance: number | null;
	skillScoreVsNaive: number | null;
	inflowMae: Money;
	outflowMae: Money;
	dailyMatrix: ConfusionMatrix | null;
}

export interface ModelSelection {
	selectedModel: string;
	holdoutFrom: IsoDate;
	selectionOrigins: number;
	holdoutOrigins: number;
	selectedHoldoutMae: Money;
	primaryHoldoutMae: Money;
	candidates: { model: string; selectionMae: Money; holdoutMae: Money }[];
}

/** QualityMetricsRs. null целиком у проверок, посчитанных до обновления бэка */
export interface QualityMetrics {
	primary: ModelScore;
	benchmarks: ModelScore[];
	originMatrix: ConfusionMatrix | null;
	scenarioDailyMatrix: ConfusionMatrix | null;
	bufferDailyMatrix: ConfusionMatrix | null;
	scenarioThreshold: number;
	selection: ModelSelection | null;
	notes: string[];
}

/** BacktestOriginRs: одна отсечка временной кросс-валидации */
export interface BacktestOrigin {
	asOfDate: IsoDate;
	status: "EVALUATED" | "SKIPPED" | (string & {});
	reason: string | null;
	maeBalance: Money | null;
	evaluatedDays: number;
	/** Дни «прогноз против факта»; нет у старых результатов и у SKIPPED-отсечек */
	days?: DayComparison[] | null;
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
	quality?: QualityMetrics | null;
	trace?: TraceStep[] | null;
}
