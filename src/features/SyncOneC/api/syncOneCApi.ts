import type { OneCSyncReport, OneCSyncRq } from "@/entities/OneC";
import { accountUrl, rtkApi } from "@/shared/api/rtkApi";

/**
 * POST …/integrations/onec/sync. Роли OWNER и ACCOUNTANT; Idempotency-Key и If-Match не нужны:
 * документы сверяются по внешнему номеру, повтор безопасен. Автоповтора мутаций нет.
 * Если данные изменились, прогноз становится STALE — инвалидируем зависимое.
 */
export const syncOneCApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		syncOneC: build.mutation<OneCSyncReport, { companyId: string; accountId: string; body: OneCSyncRq }>({
			query: ({ companyId, accountId, body }) => ({
				url: accountUrl(companyId, accountId, "/integrations/onec/sync"),
				method: "POST",
				body,
			}),
			invalidatesTags: (rs, _e, { accountId }) =>
				rs && !rs.dryRun
					? [
							{ type: "Integrations", id: accountId },
							{ type: "Plans", id: accountId },
							{ type: "PaymentCalendar", id: accountId },
							...(rs.dataChanged
								? ["Dashboard" as const, "Forecasts" as const, "Alerts" as const, "PlanFact" as const]
								: []),
						]
					: [],
		}),
	}),
});

export const { useSyncOneCMutation } = syncOneCApi;
