import type { Alert } from "@/entities/Forecast";
import { accountUrl, rtkApi } from "@/shared/api/rtkApi";

export const ackApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		acknowledgeAlert: build.mutation<Alert, { companyId: string; accountId: string; alertId: string }>({
			query: ({ companyId, accountId, alertId }) => ({
				url: accountUrl(companyId, accountId, `/alerts/${alertId}/acknowledge`),
				method: "POST",
			}),
			invalidatesTags: (_rs, _e, { accountId }) => [
				{ type: "Alerts", id: accountId },
				{ type: "Dashboard", id: accountId },
			],
		}),
	}),
});

export const { useAcknowledgeAlertMutation } = ackApi;
