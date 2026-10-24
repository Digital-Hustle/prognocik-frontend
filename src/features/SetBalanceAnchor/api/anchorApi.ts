import type { BalanceAnchor } from "@/entities/AccountHistory";
import { accountUrl, idempotency, rtkApi } from "@/shared/api/rtkApi";

export const anchorApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createBalanceAnchor: build.mutation<
			BalanceAnchor,
			{
				companyId: string;
				accountId: string;
				body: { date: string; balance: string; reason: string; supersedesId: string | null };
				idempotencyKey: string;
			}
		>({
			query: ({ companyId, accountId, body, idempotencyKey }) => ({
				url: accountUrl(companyId, accountId, "/balance-anchors"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, _e, { accountId, companyId }) => [
				{ type: "DailyHistory", id: accountId },
				{ type: "Dashboard", id: accountId },
				{ type: "Accounts", id: companyId },
				{ type: "Accounts", id: accountId },
			],
		}),
	}),
});

export const { useCreateBalanceAnchorMutation } = anchorApi;
