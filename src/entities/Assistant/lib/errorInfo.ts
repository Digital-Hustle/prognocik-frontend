import { toProblem } from "@/shared/api/problem";
import type { AssistantErrorInfo } from "../model/types";

/** Русские тексты по code из problem+json; повторять можно только то, что не ломается от повтора */
export function assistantError(error: unknown): AssistantErrorInfo {
	const { status, code } = toProblem(error);
	switch (code) {
		case "AI_NOT_CONFIGURED":
			return { text: "Ассистент пока не подключён на сервере. Попробуйте позже.", action: "none" };
		case "AI_INVALID_MESSAGES":
			return { text: "Не удалось отправить: сообщение пустое или слишком длинное.", action: "none" };
		case "AI_INVALID_CONTEXT":
			return {
				text: "Выбранный разрыв или прогноз больше недоступен. Сбросьте контекст и спросите ещё раз.",
				action: "reset-context",
			};
		case "AI_INVALID_PERIOD":
			return { text: "Период должен быть от 1 до 366 закрытых дней. Выберите другой.", action: "reset-period" };
	}
	if (status === 404) return { text: "Счёт не найден или нет доступа.", action: "none" };
	if (status === 504 || status === 502 || status === 503)
		return {
			text: "Модель сейчас не ответила. Это бывает при высокой нагрузке — попробуйте ещё раз.",
			action: "retry",
		};
	if (status === 0) return { text: "Нет связи с сервером. Проверьте интернет.", action: "retry" };
	return { text: "Не получилось получить ответ. Попробуйте ещё раз.", action: "retry" };
}
