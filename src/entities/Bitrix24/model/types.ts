import type { Instant, IsoDate, Money, Uuid } from "@/shared/api/types";

export type BitrixMode = "LIVE" | "DEMO";
export type BitrixItemKind = "DEAL" | "INVOICE";
export type BitrixAction = "CREATED" | "UPDATED" | "REOPENED" | "CANCELLED" | "UNCHANGED" | "SKIPPED";

/** StatusRs. Адрес вебхука на сервере не хранится: configuredPortal — только хост, если он задан в конфигурации */
export interface BitrixStatus {
	webhookConfigured: boolean;
	configuredPortal: string | null;
	allowedHostSuffixes: string[];
	demoAvailable: boolean;
	activePlans: number;
	activeAmount: Money;
	lastSyncedAt: Instant | null;
}

/** SyncRq: все поля необязательные */
export interface BitrixSyncRq {
	mode?: BitrixMode;
	webhookUrl?: string;
	horizonDays?: number;
	includeDeals?: boolean;
	includeInvoices?: boolean;
	weightByProbability?: boolean;
	categoryCode?: string;
	dryRun?: boolean;
}

export interface BitrixSyncItem {
	kind: BitrixItemKind;
	externalId: string;
	title: string;
	documentAmount: Money | null;
	planAmount: Money | null;
	dueDate: IsoDate | null;
	stage: "OPEN" | "WON" | "LOST" | null;
	probability: number | null;
	action: BitrixAction;
	reason: string | null;
	planId: Uuid | null;
}

/** SyncRs */
export interface BitrixSyncReport {
	mode: BitrixMode;
	portal: string | null;
	dryRun: boolean;
	from: IsoDate;
	to: IsoDate;
	fetched: number;
	created: number;
	updated: number;
	reopened: number;
	cancelled: number;
	unchanged: number;
	skipped: number;
	dataChanged: boolean;
	items: BitrixSyncItem[];
}
