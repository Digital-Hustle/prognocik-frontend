/// <reference types="vite/client" />

declare const __IS_DEV__: boolean;
declare const __API__: string;

type OptionalRecord<K extends PropertyKey, T> = {
	[P in K]?: T;
};
