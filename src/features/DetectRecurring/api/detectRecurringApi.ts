import type { Job } from "@/entities/Job";
import { recurringApi } from "@/entities/Recurring";
import type { PatternStatus, RecurringPattern } from "@/entities/Recurring";
import { accountUrl, idempotency, ifMatch, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs } from "@/shared/api/types";

export const detectRecurringApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createDetectionJob: build.mutation<
			Job,
			{ companyId: string; accountId: string; asOfDate: string; idempotencyKey: string }
		>({
			query: ({ companyId, accountId, asOfDate, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, "/recurring-detection-jobs"),
				method: "POST",
				body: { asOfDate },
				headers: idempotency(idempotencyKey),
			}),
		}),
		/** POST без тела и If-Match; решённые вручную не трогает; повтор вернёт пустой items. После — прогноз STALE */
		confirmAllDetected: build.mutation<ItemsRs<RecurringPattern>, { companyId: string; accountId: string }>({
			query: ({ companyId, accountId }) => ({
				url: accountUrl(companyId, accountId, "/recurring-patterns/confirm-detected"),
				method: "POST",
			}),
			invalidatesTags: (_rs, error, { accountId }) =>
				error
					? [{ type: "Recurring", id: accountId }]
					: [
							{ type: "Recurring", id: accountId },
							{ type: "Dashboard", id: accountId },
						],
		}),
		decideRecurring: build.mutation<
			RecurringPattern,
			{
				companyId: string;
				accountId: string;
				patternId: string;
				version: number;
				status: Exclude<PatternStatus, "DETECTED">;
			}
		>({
			query: ({ companyId, accountId, patternId, version, status }) => ({
				url: accountUrl(companyId, accountId, `/recurring-patterns/${patternId}/status`),
				method: "PUT",
				body: { status },
				headers: ifMatch(version),
			}),
			// Решение пользователя меняет входные данные прогноза → dashboard узнает STALE
			async onQueryStarted({ companyId, accountId }, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					dispatch(
						recurringApi.util.updateQueryData(
							"listRecurringPatterns",
							{ companyId, accountId },
							(draft) => {
								const i = draft.items.findIndex((p) => p.id === data.id);
								if (i >= 0) draft.items[i] = data;
							}
						)
					);
					dispatch(rtkApi.util.invalidateTags([{ type: "Dashboard", id: accountId }]));
				} catch {
					// 409 — версия устарела: перечитываем список, чтобы не затирать чужое решение
					dispatch(rtkApi.util.invalidateTags([{ type: "Recurring", id: accountId }]));
				}
			},
		}),
	}),
});

export const { useCreateDetectionJobMutation, useDecideRecurringMutation, useConfirmAllDetectedMutation } =
	detectRecurringApi;
