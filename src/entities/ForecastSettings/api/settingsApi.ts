import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ForecastSettings } from "../model/types";

export const settingsApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getForecastSettings: build.query<ForecastSettings, { companyId: string; accountId: string }>({
			query: ({ companyId, accountId }) => accountUrl(companyId, accountId, "/forecast-settings"),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Settings", id: accountId }],
		}),
	}),
});

export const { useGetForecastSettingsQuery } = settingsApi;
