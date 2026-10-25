import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { sessionExpired } from "@/shared/api/rtkApi";
import { uuid } from "@/shared/lib/id/uuid";
import type { AssistantContext, AssistantErrorInfo, AssistantPeriod, AssistantSchema, ChatRs } from "./types";

const initialState: AssistantSchema = {
	open: false,
	messages: [],
	pending: false,
	period: null,
	context: null,
	draft: "",
};

/** История живёт только в памяти вкладки: сервер её не хранит, на диск и в storage она не попадает */
export const assistantSlice = createSlice({
	name: "assistant",
	initialState,
	reducers: {
		open: (state, action: PayloadAction<{ context?: AssistantContext; draft?: string } | undefined>) => {
			state.open = true;
			if (action.payload?.context) state.context = action.payload.context;
			if (action.payload?.draft !== undefined) state.draft = action.payload.draft;
		},
		close: (state) => {
			state.open = false;
		},
		setDraft: (state, action: PayloadAction<string>) => {
			state.draft = action.payload;
		},
		addUser: {
			reducer: (state, action: PayloadAction<{ id: string; content: string }>) => {
				state.messages.push({ id: action.payload.id, kind: "user", content: action.payload.content });
				state.draft = "";
			},
			prepare: (content: string) => ({ payload: { id: uuid(), content } }),
		},
		addAnswer: {
			reducer: (state, action: PayloadAction<{ id: string; questionId: string; rs: ChatRs }>) => {
				state.messages.push({ kind: "assistant", ...action.payload });
			},
			prepare: (questionId: string, rs: ChatRs) => ({ payload: { id: uuid(), questionId, rs } }),
		},
		addError: {
			reducer: (state, action: PayloadAction<{ id: string; questionId: string; error: AssistantErrorInfo }>) => {
				state.messages.push({ kind: "error", ...action.payload });
			},
			prepare: (questionId: string, error: AssistantErrorInfo) => ({
				payload: { id: uuid(), questionId, error },
			}),
		},
		/** Убирает ответ/ошибку на вопрос — перед повторной отправкой */
		dropAnswers: (state, action: PayloadAction<string>) => {
			state.messages = state.messages.filter((m) => m.kind === "user" || m.questionId !== action.payload);
		},
		setPending: (state, action: PayloadAction<boolean>) => {
			state.pending = action.payload;
		},
		setPeriod: (state, action: PayloadAction<AssistantPeriod | null>) => {
			state.period = action.payload;
		},
		setContext: (state, action: PayloadAction<AssistantContext | null>) => {
			state.context = action.payload;
		},
		/** Новый разговор: период и контекст остаются, пока их не сбросят явно */
		clearChat: (state) => {
			state.messages = [];
			state.pending = false;
			state.draft = "";
		},
		reset: () => initialState,
	},
	extraReducers: (builder) => {
		builder.addCase(sessionExpired, () => initialState);
	},
});

export const { actions: assistantActions } = assistantSlice;
export const { reducer: assistantReducer } = assistantSlice;
