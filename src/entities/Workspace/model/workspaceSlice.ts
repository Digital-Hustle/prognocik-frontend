import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { sessionExpired } from "@/shared/api/rtkApi";
import { WORKSPACE_LOCAL_STORAGE_KEY } from "@/shared/const/localstorage";
import { storage } from "@/shared/lib/storage";
import type { WorkspaceSchema } from "./types";

function load(): WorkspaceSchema {
	try {
		const raw = storage.get(WORKSPACE_LOCAL_STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<WorkspaceSchema>;
			return { companyId: parsed.companyId ?? null, accountId: parsed.accountId ?? null };
		}
	} catch {
		/* битое значение — начинаем с выбора */
	}
	return { companyId: null, accountId: null };
}

function save(state: WorkspaceSchema) {
	storage.set(WORKSPACE_LOCAL_STORAGE_KEY, JSON.stringify(state));
}

export const workspaceSlice = createSlice({
	name: "workspace",
	initialState: load,
	reducers: {
		selectCompany: (state, action: PayloadAction<string>) => {
			if (state.companyId !== action.payload) state.accountId = null;
			state.companyId = action.payload;
			save(state);
		},
		selectAccount: (state, action: PayloadAction<{ companyId: string; accountId: string }>) => {
			state.companyId = action.payload.companyId;
			state.accountId = action.payload.accountId;
			save(state);
		},
		reset: (state) => {
			state.companyId = null;
			state.accountId = null;
			save(state);
		},
	},
	extraReducers: (builder) => {
		builder.addCase(sessionExpired, () => {
			// выбор остаётся: после повторного входа пользователь вернётся к тому же счёту
		});
	},
});

export const { actions: workspaceActions } = workspaceSlice;
export const { reducer: workspaceReducer } = workspaceSlice;
