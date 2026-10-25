import type { IsoDate, Money, Uuid } from "@/shared/api/types";

export interface CalendarTotals {
	amount: Money;
	settledAmount: Money;
	remainingAmount: Money;
	overdueAmount: Money;
}

export type CalendarItemKind = "PLANNED" | "RECURRING";

/** Строка календаря. RECURRING — расчётная дата регулярного платежа, оплат по нему не отслеживается */
export interface CalendarItem {
	id: string;
	kind: CalendarItemKind;
	expectedPaymentId: Uuid | null;
	recurringPatternId: Uuid | null;
	title: string;
	dueDate: IsoDate;
	nominalDate: IsoDate | null;
	categoryCode: string;
	counterpartyKey: string | null;
	source: string | null;
	sourceDocument: {
		externalSystem: string;
		externalId: string;
		documentNumber: string | null;
		issuedDate: IsoDate | null;
	} | null;
	status: string | null;
	amount: Money;
	settledAmount: Money | null;
	remainingAmount: Money;
	overdue: boolean;
	version: number;
}

export interface CalendarDay {
	date: IsoDate;
	totals: CalendarTotals;
	items: CalendarItem[];
}

export type CalendarWarning = "SIMPLIFIED_BUSINESS_CALENDAR" | "RECURRING_SETTLEMENT_UNKNOWN";

export interface PaymentCalendar {
	companyId: Uuid;
	accountId: Uuid;
	currency: string;
	timezone: string;
	today: IsoDate;
	dataVersion: number;
	fromDate: IsoDate;
	toDate: IsoDate;
	totals: CalendarTotals;
	days: CalendarDay[];
	overdueBeforeRangeAmount: Money;
	overdueBeforeRange: CalendarItem[];
	warnings: CalendarWarning[];
}
