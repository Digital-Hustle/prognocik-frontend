import type { Instant, IsoDate, Money, Uuid } from "@/shared/api/types";

export type DailyStatus = "OBSERVED" | "ZERO_CONFIRMED" | "MISSING";

/** DailyActualRs. MISSING — данных недостаточно, это НЕ нулевой поток */
export interface DailyActual {
	date: IsoDate;
	inflow: Money | null;
	outflow: Money | null;
	balanceEod: Money | null;
	status: DailyStatus;
	paymentCount: number;
	balanceMismatch: boolean;
}

export interface QualityWarning {
	code: string;
	message: string;
	date: IsoDate | null;
}

/** DataQualityRs */
export interface DataQualityReport {
	accountId: Uuid;
	fromDate: IsoDate;
	toDate: IsoDate;
	quality: "GOOD" | "LIMITED" | "INSUFFICIENT";
	completeDayCount: number;
	missingDayCount: number;
	balanceMismatchCount: number;
	emptyPurposeCount: number;
	warnings: QualityWarning[];
}

export type Completeness = "CONFIRMED_COMPLETE" | "UNKNOWN";

/** CompletenessRs */
export interface CompletenessRange {
	id: Uuid;
	accountId: Uuid;
	fromDate: IsoDate;
	toDate: IsoDate;
	completeness: Completeness;
	reason: string;
	createdAt: Instant;
}

/** AnchorRs — подтверждённый остаток */
export interface BalanceAnchor {
	id: Uuid;
	accountId: Uuid;
	date: IsoDate;
	balance: Money;
	source: string;
	reason: string;
	knownAt: Instant;
	supersedesId: Uuid | null;
}
