import type { Direction, IsoDate, Money, Uuid } from "@/shared/api/types";

export type GroupBy = "DAY" | "WEEK";

export interface PlanFactTotals {
	plannedIn: Money;
	plannedOut: Money;
	actualIn: Money;
	actualOut: Money;
	varianceIn: Money;
	varianceOut: Money;
	settledIn: Money;
	settledOut: Money;
	remainingIn: Money;
	remainingOut: Money;
	unplannedIn: Money;
	unplannedOut: Money;
	overdueRemainingIn: Money;
	overdueRemainingOut: Money;
}

export interface OverduePlan {
	id: Uuid;
	title: string;
	direction: Direction;
	dueDate: IsoDate;
	amount: Money;
	settledAmount: Money;
	remainingAmount: Money;
}

export interface UnplannedFact {
	id: Uuid;
	operationDate: IsoDate;
	direction: Direction;
	amount: Money;
	unallocatedAmount: Money;
	counterpartyName: string | null;
	categoryCode: string | null;
}

export interface PlanFactPeriod {
	periodStart: IsoDate;
	periodEnd: IsoDate;
	plannedIn: Money;
	plannedOut: Money;
	actualIn: Money;
	actualOut: Money;
	varianceIn: Money;
	varianceOut: Money;
	unplannedIn: Money;
	unplannedOut: Money;
	overduePlans: OverduePlan[];
	unplannedFacts: UnplannedFact[];
}

/** PlanFactRs — готов к графику без пересчёта */
export interface PlanFact {
	companyId: Uuid;
	accountId: Uuid;
	fromDate: IsoDate;
	toDate: IsoDate;
	groupBy: GroupBy;
	today: IsoDate;
	totals: PlanFactTotals;
	periods: PlanFactPeriod[];
}
