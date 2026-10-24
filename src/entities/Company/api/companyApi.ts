import { companyUrl, orch, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs, PageRs } from "@/shared/api/types";
import type { Account, Company, Member } from "../model/types";

export const companyApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		listCompanies: build.query<PageRs<Company>, void>({
			query: () => ({ url: orch("/companies"), params: { size: 100 } }),
			providesTags: (rs) => [
				{ type: "Companies", id: "LIST" },
				...(rs?.items.map((c) => ({ type: "Companies" as const, id: c.id })) ?? []),
			],
		}),
		getCompany: build.query<Company, string>({
			query: (companyId) => companyUrl(companyId),
			providesTags: (_rs, _e, id) => [{ type: "Companies", id }],
		}),
		listAccounts: build.query<PageRs<Account>, string>({
			query: (companyId) => ({ url: companyUrl(companyId, "/accounts"), params: { size: 100 } }),
			providesTags: (_rs, _e, companyId) => [{ type: "Accounts", id: companyId }],
		}),
		getAccount: build.query<Account, { companyId: string; accountId: string }>({
			query: ({ companyId, accountId }) => companyUrl(companyId, `/accounts/${accountId}`),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Accounts", id: accountId }],
		}),
		listMembers: build.query<ItemsRs<Member>, string>({
			query: (companyId) => companyUrl(companyId, "/members"),
			providesTags: (_rs, _e, companyId) => [{ type: "Members", id: companyId }],
		}),
	}),
});

export const {
	useListCompaniesQuery,
	useGetCompanyQuery,
	useListAccountsQuery,
	useGetAccountQuery,
	useListMembersQuery,
} = companyApi;
