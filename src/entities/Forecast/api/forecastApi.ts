import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs } from "@/shared/api/types";
import type { Alert, Dashboard, Forecast, GapDetails } from "../model/types";

interface AccountArgs {
	companyId: string;
	accountId: string;
}

export const forecastApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getDashboard: build.query<Dashboard, AccountArgs>({
			query: ({ companyId, accountId }) => accountUrl(companyId, accountId, "/dashboard"),
			providesTags: (_rs, _e, { accountId }) => [
				{ type: "Dashboard", id: accountId },
				{ type: "Alerts", id: accountId },
			],
		}),
		listForecasts: build.query<ItemsRs<Forecast>, AccountArgs & { limit?: number; offset?: number }>({
			query: ({ companyId, accountId, limit = 20, offset = 0 }) => ({
				url: accountUrl(companyId, accountId, "/forecasts"),
				params: { limit, offset },
			}),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Forecasts", id: accountId }],
		}),
		getForecast: build.query<Forecast, AccountArgs & { forecastId: string }>({
			query: ({ companyId, accountId, forecastId }) =>
				accountUrl(companyId, accountId, `/forecasts/${forecastId}`),
			providesTags: (_rs, _e, { forecastId }) => [{ type: "Forecasts", id: forecastId }],
		}),
		getGapDetails: build.query<GapDetails, AccountArgs & { forecastId: string; gapId: string }>({
			query: ({ companyId, accountId, forecastId, gapId }) =>
				accountUrl(companyId, accountId, `/forecasts/${forecastId}/gaps/${gapId}`),
		}),
		listAlerts: build.query<ItemsRs<Alert>, AccountArgs & { activeOnly?: boolean }>({
			query: ({ companyId, accountId, activeOnly = false }) => ({
				url: accountUrl(companyId, accountId, "/alerts"),
				params: { activeOnly, limit: 100 },
			}),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Alerts", id: accountId }],
		}),
	}),
});

export const {
	useGetDashboardQuery,
	useListForecastsQuery,
	useGetForecastQuery,
	useGetGapDetailsQuery,
	useListAlertsQuery,
} = forecastApi;
