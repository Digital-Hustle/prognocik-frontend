import { companyUrl, rtkApi } from "@/shared/api/rtkApi";
import type { GroupBy, PlanFact } from "../model/types";

export const planFactApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getPlanFact: build.query<
			PlanFact,
			{ companyId: string; accountId: string; fromDate: string; toDate: string; groupBy: GroupBy }
		>({
			query: ({ companyId, ...params }) => ({ url: companyUrl(companyId, "/plan-fact"), params }),
			providesTags: (_rs, _e, { accountId }) => [{ type: "PlanFact", id: accountId }],
		}),
	}),
});

export const { useGetPlanFactQuery } = planFactApi;
