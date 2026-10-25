import { useCallback, useRef } from "react";
import { useStore } from "react-redux";
import {
	assistantActions,
	assistantError,
	buildHistory,
	MAX_MESSAGE,
	useAskAssistantMutation,
} from "@/entities/Assistant";
import type { AssistantSchema, ChatRq } from "@/entities/Assistant";
import { useWorkspace } from "@/entities/Workspace";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";

/**
 * Отправка вопроса ассистенту. Один вопрос — один вызов; автоповтора нет, «Повторить» делает пользователь.
 * Отмена прерывает запрос в браузере; сервер может дорабатывать его дальше, ответ при этом выбрасываем.
 */
export function useAskAssistant() {
	const dispatch = useAppDispatch();
	const store = useStore<{ assistant: AssistantSchema }>();
	const { companyId, accountId } = useWorkspace();
	const [ask] = useAskAssistantMutation();
	const inflight = useRef<{ abort: () => void; cancelled: boolean } | null>(null);

	const run = useCallback(
		async (questionId: string) => {
			if (!companyId || !accountId || inflight.current) return;
			const st = store.getState().assistant;
			const q = st.messages.find((m) => m.id === questionId);
			if (!q || q.kind !== "user") return;

			dispatch(assistantActions.dropAnswers(questionId));
			dispatch(assistantActions.setPending(true));

			const body: ChatRq = { message: q.content, history: buildHistory(st.messages, questionId) };
			if (st.period) {
				body.fromDate = st.period.fromDate;
				body.toDate = st.period.toDate;
			}
			if (st.context) {
				body.forecastId = st.context.forecastId;
				if (st.context.gapId) body.gapId = st.context.gapId;
			}

			const call = ask({ companyId, accountId, body });
			const handle = { abort: () => call.abort(), cancelled: false };
			inflight.current = handle;
			try {
				const rs = await call.unwrap();
				if (!handle.cancelled) dispatch(assistantActions.addAnswer(questionId, rs));
			} catch (e) {
				if (!handle.cancelled) dispatch(assistantActions.addError(questionId, assistantError(e)));
			} finally {
				if (inflight.current === handle) {
					inflight.current = null;
					dispatch(assistantActions.setPending(false));
				}
			}
		},
		[ask, accountId, companyId, dispatch, store]
	);

	const send = useCallback(
		(text: string) => {
			const content = text.trim();
			if (!content || content.length > MAX_MESSAGE || inflight.current) return;
			const action = assistantActions.addUser(content);
			dispatch(action);
			void run(action.payload.id);
		},
		[dispatch, run]
	);

	const cancel = useCallback(() => {
		const h = inflight.current;
		if (!h) return;
		h.cancelled = true;
		h.abort();
		inflight.current = null;
		dispatch(assistantActions.setPending(false));
	}, [dispatch]);

	return { send, retry: run, cancel };
}
