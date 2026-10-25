import type { IsoDate } from "@/shared/api/types";

export type TaxAudience = "EMPLOYER" | "VAT_PAYER" | "USN" | "LEGAL_ENTITY" | "IP";

/** Справочная запись календаря: суммы не считаются, план по налогу создаёт пользователь (source=TAX) */
export interface TaxCalendarItem {
	dueDate: IsoDate;
	title: string;
	taxCode: string;
	audience: TaxAudience;
	sourceUrl: string | null;
}

export interface TaxCalendar {
	year: number;
	items: TaxCalendarItem[];
}
