/** Деньги: строка с двумя знаками. Не number — чтобы не терять копейки. */
export type Money = string;
/** "YYYY-MM-DD" */
export type IsoDate = string;
/** ISO-8601 с временем */
export type Instant = string;
export type Uuid = string;

export interface PageMeta {
	page: number;
	size: number;
	total: number;
	hasNext: boolean;
}

/** PageRs<T> — постраничные списки */
export interface PageRs<T> {
	items: T[];
	page: PageMeta;
}

/** ItemsRs<T> — списки без пагинации */
export interface ItemsRs<T> {
	items: T[];
}

export type Direction = "IN" | "OUT";
