import type { Direction, Instant, IsoDate, Money, Uuid } from "@/shared/api/types";

export type CategorySource = "RULE" | "COUNTERPARTY" | "USER" | "OTHER" | (string & {});
export type DayStatus = "OBSERVED" | "ZERO_CONFIRMED" | "MISSING";

/** PaymentRs — фактическая операция из выписки или ручная */
export interface Payment {
	id: Uuid;
	companyId: Uuid;
	accountId: Uuid;
	importId: Uuid | null;
	externalOperationId: string | null;
	sourceRow: number | null;
	operationDate: IsoDate;
	amount: Money;
	direction: Direction;
	counterpartyKey: string | null;
	counterpartyInn: string | null;
	counterpartyName: string | null;
	purpose: string | null;
	categoryCode: string;
	categorySource: CategorySource;
	ruleVersion: string | null;
	balanceEod: Money | null;
	allocatedAmount: Money | null;
	version: number;
	knownAt: Instant;
	createdAt: Instant;
	source: "STATEMENT" | "MANUAL" | (string & {});
	note: string | null;
	status: "ACTIVE" | "VOIDED";
	voidedAt: Instant | null;
	voidReason: string | null;
	replacementPaymentId: Uuid | null;
	dayStatus: DayStatus;
	requiresCompletenessConfirmation: boolean;
}

/** CategoryRs — справочник приходит с бэка */
export interface Category {
	code: string;
	name: string;
	directions: Direction[];
	system: boolean;
}

export interface Counterparty {
	key: string;
	inn: string | null;
	name: string | null;
}

export interface CategoryRevision {
	categoryCode: string;
	categorySource: CategorySource;
	ruleVersion: string | null;
	knownAt: Instant;
	actorId: Uuid | null;
	version: number;
}

export interface PaymentFilters {
	fromDate?: string;
	toDate?: string;
	direction?: Direction;
	categoryCode?: string;
	q?: string;
	sort?: string;
	page?: number;
	size?: number;
}
