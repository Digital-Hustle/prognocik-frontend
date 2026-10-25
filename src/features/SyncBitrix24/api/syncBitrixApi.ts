import type { BitrixSyncReport, BitrixSyncRq } from "@/entities/Bitrix24";
import { accountUrl, rtkApi } from "@/shared/api/rtkApi";

/**
 * POST …/integrations/bitrix24/sync. Без Idempotency-Key и If-Match (контракт Gateway): повтор безопасен,
 * потому что синхронизация сверяет планы по внешнему номеру. Автоповтора мутаций нет.
 * Живой запуск, изменивший данные, делает прогноз STALE — инвалидируем всё, что от него зависит.
 */
export const syncBitrixApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		syncBitrix: build.mutation<BitrixSyncReport, { companyId: string; accountId: string; body: BitrixSyncRq }>({
			query: ({ companyId, accountId, body }) => ({
				url: accountUrl(companyId, accountId, "/integrations/bitrix24/sync"),
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

export const { useSyncBitrixMutation } = syncBitrixApi;
