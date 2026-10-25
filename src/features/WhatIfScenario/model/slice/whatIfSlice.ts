import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { WhatIfSchema } from "../types/whatIfSchema";

export const initialWhatIf: WhatIfSchema = {
	delayReceiptPlanId: null,
	delayReceiptDays: 21,
	cancelPlanId: null,
	delayPaymentPlanId: null,
	delayPaymentDays: 14,
	revenueDropPct: 0,
	costGrowthPct: 0,
	costTarget: "RECURRING",
	extraExpense: "",
	extraExpenseDate: null,
	extraIncome: "",
	extraIncomeDate: null,
};

export const whatIfSlice = createSlice({
	name: "whatIf",
	initialState: initialWhatIf,
	reducers: {
		set: (state, action: PayloadAction<Partial<WhatIfSchema>>) => ({ ...state, ...action.payload }),
		reset: () => initialWhatIf,
	},
});

export const { actions: whatIfActions } = whatIfSlice;
export const { reducer: whatIfReducer } = whatIfSlice;
