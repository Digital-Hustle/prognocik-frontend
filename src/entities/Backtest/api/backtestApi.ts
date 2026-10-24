import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs } from "@/shared/api/types";
import type { Backtest, BacktestOrigin } from "../model/types";

interface AccountArgs {
	companyId: string;
	accountId: string;
}

export const backtestApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		listBacktests: build.query<ItemsRs<Backtest>, AccountArgs>({
			query: ({ companyId, accountId }) => ({
				url: accountUrl(companyId, accountId, "/backtests"),
				params: { limit: 20, offset: 0 },
			}),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Backtests", id: accountId }],
		}),
		getBacktest: build.query<Backtest, AccountArgs & { backtestId: string }>({
			query: ({ companyId, accountId, backtestId }) =>
				accountUrl(companyId, accountId, `/backtests/${backtestId}`),
			providesTags: (_rs, _e, { backtestId }) => [{ type: "Backtests", id: backtestId }],
		}),
		listBacktestOrigins: build.query<ItemsRs<BacktestOrigin>, AccountArgs & { backtestId: string }>({
			query: ({ companyId, accountId, backtestId }) =>
				accountUrl(companyId, accountId, `/backtests/${backtestId}/origins`),
		}),
	}),
});

export const { useListBacktestsQuery, useGetBacktestQuery, useListBacktestOriginsQuery } = backtestApi;
