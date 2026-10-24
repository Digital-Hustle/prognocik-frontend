import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs } from "@/shared/api/types";
import type { Allocation, ExpectedPayment } from "../model/types";

interface AccountArgs {
	companyId: string;
	accountId: string;
}

export const planApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		listExpectedPayments: build.query<ItemsRs<ExpectedPayment>, AccountArgs & { from: string; to: string }>({
			query: ({ companyId, accountId, from, to }) => ({
				url: accountUrl(companyId, accountId, "/expected-payments"),
				params: { from, to },
			}),
			providesTags: (rs, _e, { accountId }) => [
				{ type: "Plans", id: accountId },
				...(rs?.items.map((p) => ({ type: "Plans" as const, id: p.id })) ?? []),
			],
		}),
		getExpectedPayment: build.query<ExpectedPayment, AccountArgs & { planId: string }>({
			query: ({ companyId, accountId, planId }) =>
				accountUrl(companyId, accountId, `/expected-payments/${planId}`),
			providesTags: (_rs, _e, { planId }) => [{ type: "Plans", id: planId }],
		}),
		listAllocations: build.query<ItemsRs<Allocation>, AccountArgs & { planId: string }>({
			query: ({ companyId, accountId, planId }) =>
				accountUrl(companyId, accountId, `/expected-payments/${planId}/allocations`),
			providesTags: (_rs, _e, { planId }) => [{ type: "Allocations", id: planId }],
		}),
	}),
});

export const { useListExpectedPaymentsQuery, useGetExpectedPaymentQuery, useListAllocationsQuery } = planApi;
