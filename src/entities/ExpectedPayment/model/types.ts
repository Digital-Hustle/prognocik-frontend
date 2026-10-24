import type { Direction, Instant, IsoDate, Money, Uuid } from "@/shared/api/types";

export type PlanStatus = "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" | "CANCELLED";
export type PlanRelation = "ADDITIONAL" | "REPLACES_RECURRING" | "REPLACES_BASELINE";
export type PlanSource = "MANUAL" | "INVOICE" | "TAX" | "CONTRACT";

export interface SourceDocument {
	externalSystem: string;
	externalId: string;
	documentNumber: string | null;
	issuedDate: IsoDate | null;
}

/** ExpectedPaymentRs — будущий платёж/поступление */
export interface ExpectedPayment {
	id: Uuid;
	companyId: Uuid;
	accountId: Uuid;
	title: string;
	direction: Direction;
	amount: Money;
	dueDate: IsoDate;
	categoryCode: string;
	counterpartyKey: string | null;
	note: string | null;
	relation: PlanRelation;
	recurringPatternId: Uuid | null;
	baselineCounterpartyKey: string | null;
	source: PlanSource;
	sourceDocument: SourceDocument | null;
	status: PlanStatus;
	settledAmount: Money;
	remainingAmount: Money;
	overdue: boolean;
	knownAt: Instant;
	createdAt: Instant;
	updatedAt: Instant;
	version: number;
}

/** PlanRq — тело создания и PUT (полное, PUT не частичный) */
export interface PlanRq {
	title: string;
	direction: Direction;
	amount: Money;
	dueDate: IsoDate;
	categoryCode: string;
	counterpartyKey: string | null;
	note: string | null;
	relation: PlanRelation;
	recurringPatternId: Uuid | null;
	baselineCounterpartyKey: string | null;
	source: PlanSource;
	sourceDocument: SourceDocument | null;
}

/** AllocationRs — сопоставление плана с фактом */
export interface Allocation {
	id: Uuid;
	expectedPaymentId: Uuid;
	paymentId: Uuid;
	amount: Money;
	createdAt: Instant;
	reversedAt: Instant | null;
}
