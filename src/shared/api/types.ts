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

/** TraceStepRs — шаг пошагового лога расчёта. data — плоский словарь строк (деньги — строки с двумя знаками) */
export interface TraceStep {
	seq: number;
	/** Состав стадий не фиксирован: неизвестную стадию показываем как есть */
	stage: string;
	message: string;
	data: Record<string, string>;
}
