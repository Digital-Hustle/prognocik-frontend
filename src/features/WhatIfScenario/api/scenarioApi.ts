import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { MaxPayment, MaxPaymentRq, ScenarioPreview, ScenarioPreviewRq } from "../model/types/scenario";

interface Scope {
	companyId: string;
	accountId: string;
}

/**
 * POST …/scenarios/preview и …/scenarios/max-payment. Это чтение, которое по контракту идёт методом POST:
 * ничего не сохраняется, Idempotency-Key и If-Match не нужны, расчёт мгновенный и подходит для ползунков.
 * Результаты не кэшируем — на каждое изменение рычага запрос уходит заново.
 */
export const scenarioApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		previewScenario: build.mutation<ScenarioPreview, Scope & { body: ScenarioPreviewRq }>({
			query: ({ companyId, accountId, body }) => ({
				url: accountUrl(companyId, accountId, "/scenarios/preview"),
				method: "POST",
				body,
			}),
		}),
		maxPayment: build.mutation<MaxPayment, Scope & { body: MaxPaymentRq }>({
			query: ({ companyId, accountId, body }) => ({
				url: accountUrl(companyId, accountId, "/scenarios/max-payment"),
				method: "POST",
				body,
			}),
		}),
	}),
});

export const { usePreviewScenarioMutation, useMaxPaymentMutation } = scenarioApi;
