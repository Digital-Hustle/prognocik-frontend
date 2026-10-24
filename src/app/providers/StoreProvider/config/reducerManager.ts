import { combineReducers } from "@reduxjs/toolkit";
import type { Reducer, ReducersMapObject, UnknownAction } from "@reduxjs/toolkit";
import type { MountedReducers, ReducerManager, StateSchema, StateSchemaKey } from "./StateSchema";

export function createReducerManager(initialReducers: ReducersMapObject<StateSchema>): ReducerManager {
	const reducers = { ...initialReducers };

	let combinedReducer = combineReducers(reducers) as unknown as Reducer<StateSchema>;

	let keysToRemove: Array<StateSchemaKey> = [];

	const mountedReducers: MountedReducers = {};

	return {
		getReducerMap: () => reducers,
		getMountedReducers: () => mountedReducers,
		reduce: (state: StateSchema | undefined, action: UnknownAction) => {
			if (state && keysToRemove.length > 0) {
				state = { ...state };
				keysToRemove.forEach((key) => {
					delete state![key];
				});
				keysToRemove = [];
			}
			return combinedReducer(state, action);
		},
		add: (key: StateSchemaKey, reducer: Reducer) => {
			if (!key || reducers[key]) {
				return;
			}
			(reducers as Record<string, Reducer>)[key] = reducer;
			mountedReducers[key] = true;

			combinedReducer = combineReducers(reducers) as unknown as Reducer<StateSchema>;
		},
		remove: (key: StateSchemaKey) => {
			if (!key || !reducers[key]) {
				return;
			}
			delete reducers[key];
			keysToRemove.push(key);
			mountedReducers[key] = false;
			combinedReducer = combineReducers(reducers) as unknown as Reducer<StateSchema>;
		},
	};
}
