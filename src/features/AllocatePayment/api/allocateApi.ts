import type { Allocation } from "@/entities/ExpectedPayment";
import { accountUrl, idempotency, rtkApi } from "@/shared/api/rtkApi";

const tags = (accountId: string, planId: string) => [
	{ type: "Allocations" as const, id: planId },
	{ type: "Plans" as const, id: planId },
	{ type: "Plans" as const, id: accountId },
	{ type: "Payments" as const, id: accountId },
	{ type: "Dashboard" as const, id: accountId },
	{ type: "PlanFact" as const, id: accountId },
];

export const allocateApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		allocatePayment: build.mutation<
			Allocation,
			{
				companyId: string;
				accountId: string;
				planId: string;
				paymentId: string;
				amount: string;
				idempotencyKey: string;
			}
		>({
			query: ({ companyId, accountId, planId, paymentId, amount, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, `/expected-payments/${planId}/allocations`),
				method: "POST",
				body: { paymentId, amount },
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, _e, { accountId, planId }) => tags(accountId, planId),
		}),
		reverseAllocation: build.mutation<
			void,
			{ companyId: string; accountId: string; planId: string; allocationId: string; idempotencyKey: string }
		>({
			query: ({ companyId, accountId, allocationId, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, `/allocations/${allocationId}/reverse`),
				method: "POST",
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, _e, { accountId, planId }) => tags(accountId, planId),
		}),
	}),
});

export const { useAllocatePaymentMutation, useReverseAllocationMutation } = allocateApi;
