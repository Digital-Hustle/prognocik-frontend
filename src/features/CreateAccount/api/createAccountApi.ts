import type { Account, AccountRq } from "@/entities/Company";
import { companyUrl, idempotency, rtkApi } from "@/shared/api/rtkApi";

export const createAccountApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createAccount: build.mutation<Account, { companyId: string; body: AccountRq; idempotencyKey: string }>({
			query: ({ companyId, body, idempotencyKey }) => ({
				url: companyUrl(companyId, "/accounts"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [{ type: "Accounts", id: companyId }],
		}),
	}),
});

export const { useCreateAccountMutation } = createAccountApi;
