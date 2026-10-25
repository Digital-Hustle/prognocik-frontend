import type { IsoDate, Uuid } from "@/shared/api/types";

export type AssistantStatus = "ANSWERED" | "OUT_OF_SCOPE" | "INSUFFICIENT_DATA" | "NEEDS_CLARIFICATION";

export interface ChatTurn {
	role: "user" | "assistant";
	content: string;
}

/** ChatRq: даты — только парой (закрытые дни, до 366), gapId требует forecastId */
export interface ChatRq {
	message: string;
	history?: ChatTurn[];
	fromDate?: IsoDate;
	toDate?: IsoDate;
	forecastId?: Uuid;
	gapId?: Uuid;
}

export interface AssistantSource {
	id: string;
	type: string;
	href: string;
	asOfDate: IsoDate;
	dataVersion: number;
	fromDate: IsoDate | null;
	toDate: IsoDate | null;
	forecastId: Uuid | null;
	snapshotId: Uuid | null;
	staleness: "CURRENT" | "STALE" | null;
}

export interface AssistantFact {
	id: string;
	sourceId: string;
	text: string;
}

export interface ChatRs {
	answer: string;
	model: string;
	asOfDate: IsoDate;
	dataVersion: number;
	forecastAvailable: boolean;
	forecastStale: boolean;
	status: AssistantStatus;
	sources: AssistantSource[];
	facts: AssistantFact[];
	warnings: string[];
}

export interface AssistantPeriod {
	fromDate: IsoDate;
	toDate: IsoDate;
}

/** Контекст вопроса: разрыв прогноза. label — только для показа в чипе */
export interface AssistantContext {
	forecastId: Uuid;
	gapId?: Uuid;
	label?: string;
}

/** Что делать пользователю при ошибке */
export type AssistantErrorAction = "retry" | "reset-context" | "reset-period" | "none";

export interface AssistantErrorInfo {
	text: string;
	action: AssistantErrorAction;
}

export type AssistantMessage =
	| { id: string; kind: "user"; content: string }
	| { id: string; kind: "assistant"; questionId: string; rs: ChatRs }
	| { id: string; kind: "error"; questionId: string; error: AssistantErrorInfo };

export interface AssistantSchema {
	open: boolean;
	messages: AssistantMessage[];
	pending: boolean;
	period: AssistantPeriod | null;
	context: AssistantContext | null;
	/** Текст, который кнопка «Спросить про…» кладёт в поле ввода */
	draft: string;
}
