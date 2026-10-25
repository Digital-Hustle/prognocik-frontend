import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ChatRq, ChatRs } from "../model/types";

/**
 * POST …/assistant/chat. Без Idempotency-Key и без автоповтора: каждый вызов — до двух обращений к модели.
 * Отказы по теме и нехватке данных приходят как 200 со status ≠ ANSWERED.
 */
export const assistantApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		askAssistant: build.mutation<ChatRs, { companyId: string; accountId: string; body: ChatRq }>({
			query: ({ companyId, accountId, body }) => ({
				url: accountUrl(companyId, accountId, "/assistant/chat"),
				method: "POST",
				body,
			}),
		}),
	}),
});

export const { useAskAssistantMutation } = assistantApi;
