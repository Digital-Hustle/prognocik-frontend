import type { ForecastScope } from "@/entities/Forecast";
import type { Job } from "@/entities/Job";
import { accountUrl, idempotency, rtkApi } from "@/shared/api/rtkApi";

export interface BacktestRq {
	asOfDate: string;
	firstOrigin: string;
	lastOrigin: string;
	stepDays: number;
	scope: ForecastScope;
	windowWeeks: number;
	evaluateRisk: boolean;
}

export const runBacktestApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createBacktestJob: build.mutation<
			Job,
			{ companyId: string; accountId: string; body: BacktestRq; idempotencyKey: string }
		>({
			query: ({ companyId, accountId, body, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, "/backtest-jobs"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
		}),
	}),
});

export const { useCreateBacktestJobMutation } = runBacktestApi;
