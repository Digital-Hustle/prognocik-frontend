import { MAX_HISTORY, MAX_MESSAGE } from "../model/consts";
import type { AssistantMessage, ChatTurn } from "../model/types";

/**
 * История для запроса: реплики до вопроса `questionId`, не больше 10, каждая не длиннее 2000 символов.
 * Ошибки в историю не попадают. Сервер считает историю недоверенной, но контекст из неё берёт.
 */
export function buildHistory(messages: AssistantMessage[], questionId: string): ChatTurn[] {
	const idx = messages.findIndex((m) => m.id === questionId);
	const before = idx === -1 ? messages : messages.slice(0, idx);
	const turns: ChatTurn[] = [];
	for (const m of before) {
		if (m.kind === "user") turns.push({ role: "user", content: m.content.slice(0, MAX_MESSAGE) });
		else if (m.kind === "assistant" && m.rs.answer.trim())
			turns.push({ role: "assistant", content: m.rs.answer.slice(0, MAX_MESSAGE) });
	}
	return turns.slice(-MAX_HISTORY);
}
