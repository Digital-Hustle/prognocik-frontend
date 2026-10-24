import type { ForecastScope } from "@/entities/Forecast";
import type { Job } from "@/entities/Job";
import { accountUrl, idempotency, rtkApi } from "@/shared/api/rtkApi";

export interface RunForecastArgs {
	companyId: string;
	accountId: string;
	asOfDate: string;
	scope: ForecastScope;
	idempotencyKey: string;
}

export const runForecastApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createForecastJob: build.mutation<Job, RunForecastArgs>({
			query: ({ companyId, accountId, asOfDate, scope, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, "/forecast-jobs"),
				method: "POST",
				body: { asOfDate, scope },
				headers: idempotency(idempotencyKey),
			}),
		}),
	}),
});

export const { useCreateForecastJobMutation } = runForecastApi;
