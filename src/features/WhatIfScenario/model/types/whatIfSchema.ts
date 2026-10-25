export type CostTarget = "RECURRING" | "ALL_OUTFLOWS";

/** Состояние рычагов «что если». Пустое значение = рычаг не включён */
export interface WhatIfSchema {
	/** Клиент заплатит позже: план-поступление и на сколько дней */
	delayReceiptPlanId: string | null;
	delayReceiptDays: number;
	/** Оплата по счёту не придёт: план исчезает из прогноза */
	cancelPlanId: string | null;
	/** Мы заплатим позже: план-списание и на сколько дней */
	delayPaymentPlanId: string | null;
	delayPaymentDays: number;
	/** Падение выручки, % */
	revenueDropPct: number;
	/** Рост постоянных расходов, % */
	costGrowthPct: number;
	costTarget: CostTarget;
	/** Внеплановый расход */
	extraExpense: string;
	extraExpenseDate: string | null;
	/** Разовое поступление (кредит, предоплата) */
	extraIncome: string;
	extraIncomeDate: string | null;
}
