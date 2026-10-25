import type { Direction, IsoDate, Money, Uuid } from "@/shared/api/types";

/** TotalRs: оборот одного направления */
export interface AnalyticsTotal {
	direction: Direction;
	amount: Money;
	paymentCount: number;
}

/** Доля в процентах, строка с двумя знаками ("40.00"): процент от оборота того же направления */
export interface CategoryShare {
	direction: Direction;
	categoryCode: string;
	amount: Money;
	paymentCount: number;
	sharePercent: string;
}

/** counterpartyKey = null — «неопознанные контрагенты» */
export interface CounterpartyShare {
	direction: Direction;
	counterpartyKey: string | null;
	counterpartyInn: string | null;
	counterpartyName: string | null;
	amount: Money;
	paymentCount: number;
	sharePercent: string;
}

interface AnalyticsBase {
	companyId: Uuid;
	accountId: Uuid;
	fromDate: IsoDate;
	toDate: IsoDate;
	/** null — оба направления считаются отдельно */
	direction: Direction | null;
	totals: AnalyticsTotal[];
}

export interface CategoryAnalytics extends AnalyticsBase {
	items: CategoryShare[];
}

export interface CounterpartyAnalytics extends AnalyticsBase {
	items: CounterpartyShare[];
}

export interface AnalyticsQuery {
	companyId: string;
	accountId: string;
	fromDate: IsoDate;
	toDate: IsoDate;
	direction?: Direction;
}
