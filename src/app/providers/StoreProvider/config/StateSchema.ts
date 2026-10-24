import type { EnhancedStore, Reducer, ReducersMapObject, UnknownAction } from "@reduxjs/toolkit";
import type { UserSchema } from "@/entities/User";
import type { WorkspaceSchema } from "@/entities/Workspace";
import type { AuthByEmailSchema } from "@/features/AuthByEmail";
import type { WhatIfSchema } from "@/features/WhatIfScenario";
import type { rtkApi } from "@/shared/api/rtkApi";

export interface StateSchema {
	user: UserSchema;
	workspace: WorkspaceSchema;
	[rtkApi.reducerPath]: ReturnType<typeof rtkApi.reducer>;

	// Асинхронные редюсеры
	authByEmail?: AuthByEmailSchema;
	whatIf?: WhatIfSchema;
}

export type StateSchemaKey = keyof StateSchema;
export type MountedReducers = OptionalRecord<StateSchemaKey, boolean>;

export interface ReducerManager {
	getReducerMap: () => ReducersMapObject<StateSchema>;
	reduce: (state: StateSchema | undefined, action: UnknownAction) => StateSchema;
	add: (key: StateSchemaKey, reducer: Reducer) => void;
	remove: (key: StateSchemaKey) => void;
	// true — вмонтирован, false — демонтирован
	getMountedReducers: () => MountedReducers;
}

export interface ReduxStoreWithManager extends EnhancedStore<StateSchema> {
	reducerManager: ReducerManager;
}
