import type { Reducer } from "@reduxjs/toolkit";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useDispatch, useStore } from "react-redux";

// Лениво подключаемые редюсеры (как в WINNER). Тип стора описан структурно, чтобы shared не импортировал app.
interface StoreWithManager {
	reducerManager: {
		add: (key: never, reducer: Reducer) => void;
		remove: (key: never) => void;
		getMountedReducers: () => Record<string, boolean | undefined>;
	};
}

export type ReducersList = Record<string, Reducer>;

interface DynamicModuleLoaderProps {
	children?: ReactNode;
	reducers: ReducersList;
	removeAfterUnmount?: boolean;
}

export const DynamicModuleLoader = ({ children, reducers, removeAfterUnmount }: DynamicModuleLoaderProps) => {
	const store = useStore() as unknown as StoreWithManager;
	const dispatch = useDispatch();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const mounted = store.reducerManager.getMountedReducers();

		Object.entries(reducers).forEach(([name, reducer]) => {
			if (!mounted[name]) {
				store.reducerManager.add(name as never, reducer);
				dispatch({ type: `@INIT ${name} reducer` });
			}
		});
		setReady(true);

		return () => {
			if (removeAfterUnmount) {
				Object.keys(reducers).forEach((name) => {
					store.reducerManager.remove(name as never);
					dispatch({ type: `@DESTROY ${name} reducer` });
				});
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return ready ? <>{children}</> : null;
};
