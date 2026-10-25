import { companyUrl, rtkApi } from "@/shared/api/rtkApi";
import type { AnalyticsQuery, CategoryAnalytics, CounterpartyAnalytics } from "../model/types";

const params = ({ accountId, fromDate, toDate, direction }: AnalyticsQuery) => ({
	accountId,
	fromDate,
	toDate,
	...(direction ? { direction } : {}),
});

/** Период 1–366 дней включительно; иначе 422 INVALID_RANGE. Результат — текущее состояние, не срез на дату. */
export const analyticsApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getCategoryAnalytics: build.query<CategoryAnalytics, AnalyticsQuery>({
			query: (q) => ({ url: companyUrl(q.companyId, "/analytics/categories"), params: params(q) }),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Analytics", id: accountId }],
		}),
		getCounterpartyAnalytics: build.query<CounterpartyAnalytics, AnalyticsQuery>({
			query: (q) => ({ url: companyUrl(q.companyId, "/analytics/counterparties"), params: params(q) }),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Analytics", id: accountId }],
		}),
	}),
});

export const { useGetCategoryAnalyticsQuery, useGetCounterpartyAnalyticsQuery } = analyticsApi;
