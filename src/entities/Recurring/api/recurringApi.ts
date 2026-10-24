import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs } from "@/shared/api/types";
import type { RecurringPattern } from "../model/types";

export const recurringApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		listRecurringPatterns: build.query<ItemsRs<RecurringPattern>, { companyId: string; accountId: string }>({
			query: ({ companyId, accountId }) => accountUrl(companyId, accountId, "/recurring-patterns"),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Recurring", id: accountId }],
		}),
	}),
});

export const { useListRecurringPatternsQuery } = recurringApi;
