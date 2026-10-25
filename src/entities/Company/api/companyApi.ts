import { companyUrl, orch, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs, PageRs } from "@/shared/api/types";
import type { Account, Company, Member } from "../model/types";

export const companyApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		/**
		 * Все компании пользователя. Бэк отдаёт не больше 200 на страницу, а после массовой загрузки их сотни,
		 * поэтому читаем страницы подряд до hasNext=false (не больше 20 запросов — 4000 компаний).
		 */
		listCompanies: build.query<PageRs<Company>, void>({
			queryFn: async (_arg, _api, _extra, baseQuery) => {
				const items: Company[] = [];
				for (let page = 0; page < 20; page++) {
					const rs = await baseQuery({ url: orch("/companies"), params: { page, size: 200 } });
					if (rs.error) return { error: rs.error };
					const data = rs.data as PageRs<Company>;
					items.push(...data.items);
					if (!data.page.hasNext) break;
				}
				return { data: { items, page: { page: 0, size: items.length, total: items.length, hasNext: false } } };
			},
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
