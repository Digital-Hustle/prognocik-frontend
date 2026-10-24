import type { Completeness, CompletenessRange } from "@/entities/AccountHistory";
import { accountUrl, idempotency, rtkApi } from "@/shared/api/rtkApi";

export const completenessApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		setCompleteness: build.mutation<
			CompletenessRange,
			{
				companyId: string;
				accountId: string;
				body: { fromDate: string; toDate: string; completeness: Completeness; reason: string };
				idempotencyKey: string;
			}
		>({
			query: ({ companyId, accountId, body, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, "/completeness"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, _e, { accountId }) => [
				{ type: "Completeness", id: accountId },
				{ type: "DailyHistory", id: accountId },
				{ type: "DataQuality", id: accountId },
				{ type: "Dashboard", id: accountId },
			],
		}),
	}),
});

export const { useSetCompletenessMutation } = completenessApi;
