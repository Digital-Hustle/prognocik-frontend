import type { ExpectedPayment, PlanRq } from "@/entities/ExpectedPayment";
import { accountUrl, idempotency, ifMatch, rtkApi } from "@/shared/api/rtkApi";

const planTags = (accountId: string, planId?: string) => [
	{ type: "Plans" as const, id: accountId },
	...(planId ? [{ type: "Plans" as const, id: planId }] : []),
	{ type: "Dashboard" as const, id: accountId },
	{ type: "PlanFact" as const, id: accountId },
];

export const editPlanApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createExpectedPayment: build.mutation<
			ExpectedPayment,
			{ companyId: string; accountId: string; body: PlanRq; idempotencyKey: string }
		>({
			query: ({ companyId, accountId, body, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, "/expected-payments"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, error, { accountId }) => (error ? [] : planTags(accountId)),
		}),
		/** PUT не частичный: отправляем все редактируемые поля, включая явные null */
		updateExpectedPayment: build.mutation<
			ExpectedPayment,
			{ companyId: string; accountId: string; planId: string; version: number; body: PlanRq }
		>({
			query: ({ companyId, accountId, planId, version, body }) => ({
				url: accountUrl(companyId, accountId, `/expected-payments/${planId}`),
				method: "PUT",
				body,
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { accountId, planId }) => planTags(accountId, planId),
		}),
		cancelExpectedPayment: build.mutation<
			ExpectedPayment,
			{ companyId: string; accountId: string; planId: string; version: number }
		>({
			query: ({ companyId, accountId, planId, version }) => ({
				url: accountUrl(companyId, accountId, `/expected-payments/${planId}/cancel`),
				method: "POST",
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { accountId, planId }) => planTags(accountId, planId),
		}),
	}),
});

export const { useCreateExpectedPaymentMutation, useUpdateExpectedPaymentMutation, useCancelExpectedPaymentMutation } =
	editPlanApi;
