import type { IsoDate, Money, Uuid } from "@/shared/api/types";

export type OneCAction = "CREATED" | "UPDATED" | "UNCHANGED" | "SKIPPED";

/** Тело POST …/integrations/onec/sync: оба поля необязательные */
export interface OneCSyncRq {
	fromDate?: IsoDate;
	dryRun?: boolean;
}

export interface OneCSyncItem {
	externalId: string;
	documentNumber: string | null;
	title: string;
	direction: "IN" | "OUT";
	amount: Money;
	dueDate: IsoDate;
	action: OneCAction;
	reason: string | null;
	planId: Uuid | null;
}

export interface OneCSyncReport {
	source: string;
	demo: boolean;
	dryRun: boolean;
	from: IsoDate;
	created: number;
	updated: number;
	unchanged: number;
	skipped: number;
	dataChanged: boolean;
	items: OneCSyncItem[];
}
