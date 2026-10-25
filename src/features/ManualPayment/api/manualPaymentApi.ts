import type { Payment } from "@/entities/Payment";
import { companyUrl, idempotency, ifMatch, rtkApi } from "@/shared/api/rtkApi";
import type { Direction, ItemsRs } from "@/shared/api/types";

/** ManualPaymentRq: accountId — в теле, не в пути. Пустые необязательные поля бэк сам превращает в null */
export interface ManualPaymentRq {
	accountId: string;
	operationDate: string;
	amount: string;
	direction: Direction;
	counterpartyInn: string | null;
	counterpartyName: string | null;
	purpose: string | null;
	categoryCode: string | null;
	note: string | null;
}

export type DuplicateDecision = "SAME" | "DIFFERENT";

/** Ручной факт, его аннулирование и решение по дубликатам меняют dataVersion → прогноз STALE */
const dataTags = (accountId: string) => [
	{ type: "Payments" as const, id: accountId },
	{ type: "Dashboard" as const, id: accountId },
	{ type: "PlanFact" as const, id: accountId },
	{ type: "Analytics" as const, id: accountId },
	{ type: "DailyHistory" as const, id: accountId },
	{ type: "DataQuality" as const, id: accountId },
	{ type: "Completeness" as const, id: accountId },
	{ type: "Plans" as const, id: accountId },
];

export const manualPaymentApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createManualPayment: build.mutation<
			Payment,
			{ companyId: string; body: ManualPaymentRq; idempotencyKey: string }
		>({
			query: ({ companyId, body, idempotencyKey }) => ({
				url: companyUrl(companyId, "/payments"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, error, { body }) => (error ? [] : dataTags(body.accountId)),
		}),
		voidManualPayment: build.mutation<
			Payment,
			{ companyId: string; accountId: string; paymentId: string; version: number; reason: string }
		>({
			query: ({ companyId, paymentId, version, reason }) => ({
				url: companyUrl(companyId, `/payments/${paymentId}/void`),
				method: "POST",
				body: { reason },
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, error, { accountId, paymentId }) =>
				error
					? [{ type: "Payments", id: paymentId }]
					: [{ type: "Payments", id: paymentId }, ...dataTags(accountId)],
		}),
		/** Похожие операции из выписки: та же дата, сумма и направление. Только для активного ручного платежа */
		listDuplicateCandidates: build.query<ItemsRs<Payment>, { companyId: string; paymentId: string }>({
			query: ({ companyId, paymentId }) => companyUrl(companyId, `/payments/${paymentId}/duplicate-candidates`),
			providesTags: (_rs, _e, { paymentId }) => [{ type: "Payments", id: paymentId }],
		}),
		/** SAME: ручной платёж аннулируется, банковская операция остаётся в расчёте. DIFFERENT: оба остаются */
		resolveDuplicate: build.mutation<
			Payment,
			{
				companyId: string;
				accountId: string;
				paymentId: string;
				version: number;
				importedPaymentId: string;
				importedPaymentVersion: number;
				decision: DuplicateDecision;
				reason: string;
			}
		>({
			query: ({ companyId, paymentId, version, ...body }) => ({
				url: companyUrl(companyId, `/payments/${paymentId}/duplicate-resolutions`),
				method: "POST",
				body: {
					importedPaymentId: body.importedPaymentId,
					importedPaymentVersion: body.importedPaymentVersion,
					decision: body.decision,
					reason: body.reason,
				},
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, error, { accountId, paymentId }) =>
				error
					? [{ type: "Payments", id: paymentId }]
					: [{ type: "Payments", id: paymentId }, ...dataTags(accountId)],
		}),
	}),
});

export const {
	useCreateManualPaymentMutation,
	useVoidManualPaymentMutation,
	useListDuplicateCandidatesQuery,
	useResolveDuplicateMutation,
} = manualPaymentApi;
