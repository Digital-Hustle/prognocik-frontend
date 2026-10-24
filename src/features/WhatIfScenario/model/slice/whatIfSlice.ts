import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { WhatIfSchema } from "../types/whatIfSchema";

export const initialWhatIf: WhatIfSchema = {
	delayedPlanId: null,
	delayWeeks: 2,
	revenueDropPct: 0,
	fixedCostGrowthPct: 0,
	extraExpense: "",
	extraExpenseDate: null,
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
