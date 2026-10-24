import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs, PageRs } from "@/shared/api/types";
import type { CompletenessRange, DailyActual, DataQualityReport } from "../model/types";

interface AccountArgs {
	companyId: string;
	accountId: string;
}

export const historyApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getDailyHistory: build.query<ItemsRs<DailyActual>, AccountArgs & { from: string; to: string }>({
			query: ({ companyId, accountId, from, to }) => ({
				url: accountUrl(companyId, accountId, "/daily-history"),
				params: { from, to },
			}),
			providesTags: (_rs, _e, { accountId }) => [{ type: "DailyHistory", id: accountId }],
		}),
		getDataQuality: build.query<DataQualityReport, AccountArgs>({
			query: ({ companyId, accountId }) => accountUrl(companyId, accountId, "/data-quality"),
			providesTags: (_rs, _e, { accountId }) => [{ type: "DataQuality", id: accountId }],
		}),
		listCompletenessRanges: build.query<PageRs<CompletenessRange>, AccountArgs>({
			query: ({ companyId, accountId }) => ({
				url: accountUrl(companyId, accountId, "/completeness-ranges"),
				params: { size: 100 },
			}),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Completeness", id: accountId }],
		}),
	}),
});

export const { useGetDailyHistoryQuery, useGetDataQualityQuery, useListCompletenessRangesQuery } = historyApi;
