export interface WhatIfSchema {
	/** id ожидаемого поступления, которое «задержится» (из dashboard.upcomingPayments) */
	delayedPlanId: string | null;
	delayWeeks: number;
	/** Падение выручки, % (регулярные и обычные поступления) */
	revenueDropPct: number;
	/** Рост постоянных расходов, % (регулярные списания) */
	fixedCostGrowthPct: number;
	/** Внеплановый расход */
	extraExpense: string;
	extraExpenseDate: string | null;
}
