import type { ForecastSettings, ForecastSettingsRq } from "@/entities/ForecastSettings";
import { accountUrl, ifMatch, rtkApi } from "@/shared/api/rtkApi";

export const settingsMutationApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		updateForecastSettings: build.mutation<
			ForecastSettings,
			{ companyId: string; accountId: string; version: number; body: ForecastSettingsRq }
		>({
			query: ({ companyId, accountId, version, body }) => ({
				url: accountUrl(companyId, accountId, "/forecast-settings"),
				method: "PUT",
				body,
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { accountId }) => [
				{ type: "Settings", id: accountId },
				{ type: "Dashboard", id: accountId },
			],
		}),
	}),
});

export const { useUpdateForecastSettingsMutation } = settingsMutationApi;
