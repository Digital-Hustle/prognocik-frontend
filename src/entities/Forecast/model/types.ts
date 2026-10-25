import type { Direction, Instant, IsoDate, Money, TraceStep, Uuid } from "@/shared/api/types";

export type ForecastScope = "HISTORY_ONLY" | "WITH_KNOWN_PLANS";
export type DataQuality = "GOOD" | "LIMITED" | "INSUFFICIENT";
export type RiskAvailability = "AVAILABLE" | "INSUFFICIENT_HISTORY" | "INPUT_INCOMPLETE";
export type Staleness = "CURRENT" | "STALE";
/** CASH_GAP — ниже нуля, BUFFER_BREACH — ниже страхового буфера */
export type GapKind = "CASH_GAP" | "BUFFER_BREACH" | (string & {});

export interface ForecastWarning {
	code: string;
	message: string;
	date: IsoDate | null;
}

/** ForecastDayRs: серверные суммы компонент, деньги строкой */
export interface ForecastDay {
	date: IsoDate;
	plannedIn: Money;
	plannedOut: Money;
	recurringIn: Money;
	recurringOut: Money;
	residualIn: Money;
	residualOut: Money;
	inflow: Money;
	outflow: Money;
	balance: Money;
	balanceP10: Money | null;
	balanceP50: Money | null;
	balanceP90: Money | null;
	pBelowZero: number | null;
	pBelowBuffer: number | null;
}

/** RiskEstimateRs. probability в долях; null ≠ 0% */
export interface RiskEstimate {
	availability: RiskAvailability;
	method: string | null;
	probability: number | null;
	scenarioCount: number;
	calibrationOriginCount: number;
	probabilityCalibrated: boolean;
	assumptions: string[];
}

/** GapEpisodeRs */
export interface GapEpisode {
	id: Uuid;
	kind: GapKind;
	fromDate: IsoDate;
	toDate: IsoDate;
	threshold: Money;
	expectedMinimumBalance: Money;
	expectedShortfall: Money;
	probability: number | null;
	shortfallP50: Money | null;
	shortfallP90: Money | null;
	shortfallBasis: string | null;
	riskEstimateAvailability: RiskAvailability;
}

export interface ForecastSettingsSnapshot {
	windowWeeks: number;
	horizonDays: number;
	bufferAmount: Money;
	scenarioCount: number;
	minCalibrationOrigins: number;
	calibrationStepDays: number;
	algorithm: string;
}

/** ForecastRs (Forecast service) + staleness/createdAt от Orchestrator */
export interface Forecast {
	id: Uuid;
	companyId: Uuid;
	accountId: Uuid;
	jobId: Uuid;
	asOfDate: IsoDate;
	horizonDays: number;
	scope: ForecastScope;
	algorithm: string;
	algorithmVersion: string;
	settings: ForecastSettingsSnapshot;
	inputDataVersion: number;
	snapshotId: Uuid;
	staleness: Staleness;
	startBalance: Money | null;
	startBalanceDate: IsoDate | null;
	quality: DataQuality;
	warnings: ForecastWarning[];
	riskEstimate: RiskEstimate | null;
	expectedMinimumBalance: Money | null;
	firstExpectedGapDate: IsoDate | null;
	maxExpectedShortfall: Money | null;
	days: ForecastDay[];
	gaps: GapEpisode[];
	/** Шаги расчёта. null/нет у прогнозов, посчитанных до обновления бэка — просим пересчитать */
	trace?: TraceStep[] | null;
	createdAt: Instant;
}

export type AlertCode = "CASH_GAP" | "BUFFER_BREACH" | "OVERDUE_PLAN" | "DATA_QUALITY";

/** AlertView */
export interface Alert {
	id: Uuid;
	companyId: Uuid;
	accountId: Uuid;
	forecastId: Uuid | null;
	gapId: Uuid | null;
	planId: Uuid | null;
	code: AlertCode;
	title: string;
	message: string;
	fromDate: IsoDate | null;
	toDate: IsoDate | null;
	/** Нехватка для разрыва или неоплаченный остаток просроченного плана */
	amount: Money | null;
	probability: number | null;
	active: boolean;
	acknowledgedAt: Instant | null;
	staleness: Staleness | null;
	inputDataVersion: number;
	createdAt: Instant;
}

/** Сборка dashboard в ResultQueryService */
export interface Dashboard {
	companyId: Uuid;
	accountId: Uuid;
	asOfDate: IsoDate;
	dataVersion: number;
	currentBalance: { balance: Money; date: IsoDate; startBalanceDate: IsoDate } | null;
	latestForecast: Forecast | null;
	latestBacktest: BacktestSummary | null;
	refresh: {
		needsRefresh: boolean;
		autoRefreshEnabled: boolean;
		dataVersion: number;
		latestForecastInputVersion: number;
	};
	activeAlerts: Alert[];
	upcomingPayments: {
		id: Uuid;
		title: string;
		dueDate: IsoDate;
		remainingAmount: Money;
		direction: Direction;
	}[];
	quality: DataQuality;
	runningJobs: { id: Uuid; type: string; status: string; origin: string; progress: number }[];
	permissions: { canRead: boolean; canWrite: boolean; canManageMembers: boolean };
}

/** Минимум полей backtest, которые нужны дашборду (полный тип — entities/Backtest) */
export interface BacktestSummary {
	id: Uuid;
	maeBalance: Money | null;
	rmseBalance: Money | null;
	evaluatedOrigins: number;
	skippedOrigins: number;
	firstOrigin: IsoDate;
	lastOrigin: IsoDate;
	gapMetrics: { precision: number | null; recall: number | null; medianLeadDays: number | null } | null;
	staleness: Staleness;
	createdAt: Instant;
}

/** GapDetails: почему возник разрыв и что можно сделать */
export interface PaymentFactor {
	id: Uuid | null;
	kind: string;
	source: string;
	title: string;
	categoryCode: string | null;
	date: IsoDate;
	nominalDate: IsoDate | null;
	direction: Direction;
	amount: Money;
	inGapPeriod: boolean;
}

export interface ProjectedFlow {
	date: IsoDate;
	plannedIn: Money;
	plannedOut: Money;
	recurringIn: Money;
	recurringOut: Money;
	residualIn: Money;
	residualOut: Money;
}

export interface GapDetails {
	forecastId: Uuid;
	snapshotId: Uuid;
	gapId: Uuid;
	asOfDate: IsoDate;
	inputDataVersion: number;
	staleness: Staleness;
	createdAt: Instant;
	gap: GapEpisode;
	explanation: string;
	mandatoryOutflows: PaymentFactor[];
	expectedInflows: PaymentFactor[];
	overduePlans: { id?: Uuid; title?: string; dueDate?: IsoDate; remainingAmount?: Money; direction?: Direction }[];
	projectedFlows: ProjectedFlow[];
	dataLimitations: ForecastWarning[];
	recommendations: { code: string; title: string; message: string; relatedPlanIds: Uuid[] }[];
}
