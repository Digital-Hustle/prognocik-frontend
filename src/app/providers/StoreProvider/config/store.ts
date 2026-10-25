import { configureStore } from "@reduxjs/toolkit";
import type { ReducersMapObject } from "@reduxjs/toolkit";
import { assistantReducer } from "@/entities/Assistant";
import { userReducer } from "@/entities/User";
import { workspaceReducer } from "@/entities/Workspace";
import { rtkApi } from "@/shared/api/rtkApi";
import { createReducerManager } from "./reducerManager";
import type { ReduxStoreWithManager, StateSchema } from "./StateSchema";

export function createReduxStore(initialState?: StateSchema, asyncReducers?: ReducersMapObject<StateSchema>) {
	const rootReducers = {
		...asyncReducers,
		user: userReducer,
		workspace: workspaceReducer,
		assistant: assistantReducer,
		[rtkApi.reducerPath]: rtkApi.reducer,
	} as ReducersMapObject<StateSchema>;

	const reducerManager = createReducerManager(rootReducers);

	const store = configureStore({
		reducer: reducerManager.reduce,
		devTools: __IS_DEV__,
		preloadedState: initialState,
		middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(rtkApi.middleware),
	}) as unknown as ReduxStoreWithManager;

	store.reducerManager = reducerManager;

	return store;
}

export type AppStore = ReturnType<typeof createReduxStore>;
