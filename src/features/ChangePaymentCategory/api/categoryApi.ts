import type { Payment } from "@/entities/Payment";
import { accountUrl, idempotency, ifMatch, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs } from "@/shared/api/types";

/** Смена категории делает прогноз STALE (dataVersion растёт) */
const staleTags = (accountId: string) => [
	{ type: "Dashboard" as const, id: accountId },
	{ type: "PlanFact" as const, id: accountId },
	{ type: "Analytics" as const, id: accountId },
];

export const categoryApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		changePaymentCategory: build.mutation<
			Payment,
			{ companyId: string; accountId: string; paymentId: string; version: number; categoryCode: string }
		>({
			query: ({ companyId, accountId, paymentId, version, categoryCode }) => ({
				url: accountUrl(companyId, accountId, `/payments/${paymentId}/category`),
				method: "PUT",
				body: { categoryCode },
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, error, { accountId, paymentId }) =>
				error
					? [{ type: "Payments", id: paymentId }]
					: [{ type: "Payments", id: paymentId }, ...staleTags(accountId)],
		}),
		bulkChangeCategory: build.mutation<
			ItemsRs<Payment>,
			{
				companyId: string;
				accountId: string;
				categoryCode: string;
				payments: { paymentId: string; expectedVersion: number }[];
				idempotencyKey: string;
			}
		>({
			query: ({ companyId, accountId, categoryCode, payments, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, "/payments/category-changes"),
				method: "POST",
				body: { categoryCode, payments },
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, _e, { accountId }) => [{ type: "Payments", id: accountId }, ...staleTags(accountId)],
		}),
	}),
});

export const { useChangePaymentCategoryMutation, useBulkChangeCategoryMutation } = categoryApi;
