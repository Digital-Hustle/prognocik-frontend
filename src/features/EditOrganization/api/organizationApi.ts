import type { Account, AccountRq, Company, CompanyRq } from "@/entities/Company";
import { companyUrl, idempotency, ifMatch, rtkApi } from "@/shared/api/rtkApi";

/**
 * PUT/archive компании и счёта. Версия идёт в If-Match; при VERSION_CONFLICT данные перечитываем (теги сбрасываются
 * и при отказе), поэтому форма показывает актуальную версию. Архив — Idempotency-Key, автоповтора нет.
 */
export const organizationApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		updateCompany: build.mutation<Company, { companyId: string; version: number; body: CompanyRq }>({
			query: ({ companyId, version, body }) => ({
				url: companyUrl(companyId),
				method: "PUT",
				body,
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [
				{ type: "Companies", id: companyId },
				{ type: "Companies", id: "LIST" },
			],
		}),
		updateAccount: build.mutation<
			Account,
			{ companyId: string; accountId: string; version: number; body: AccountRq }
		>({
			query: ({ companyId, accountId, version, body }) => ({
				url: companyUrl(companyId, `/accounts/${accountId}`),
				method: "PUT",
				body,
				headers: ifMatch(version),
			}),
			invalidatesTags: (_rs, _e, { companyId, accountId }) => [
				{ type: "Accounts", id: accountId },
				{ type: "Accounts", id: companyId },
			],
		}),
		archiveCompany: build.mutation<Company, { companyId: string; version: number; idempotencyKey: string }>({
			query: ({ companyId, version, idempotencyKey }) => ({
				url: companyUrl(companyId, "/archive"),
				method: "POST",
				headers: { ...ifMatch(version), ...idempotency(idempotencyKey) },
			}),
			invalidatesTags: (_rs, _e, { companyId }) => [
				{ type: "Companies", id: companyId },
				{ type: "Companies", id: "LIST" },
			],
		}),
		archiveAccount: build.mutation<
			Account,
			{ companyId: string; accountId: string; version: number; idempotencyKey: string }
		>({
			query: ({ companyId, accountId, version, idempotencyKey }) => ({
				url: companyUrl(companyId, `/accounts/${accountId}/archive`),
				method: "POST",
				headers: { ...ifMatch(version), ...idempotency(idempotencyKey) },
			}),
			invalidatesTags: (_rs, _e, { companyId, accountId }) => [
				{ type: "Accounts", id: accountId },
				{ type: "Accounts", id: companyId },
			],
		}),
	}),
});

export const {
	useUpdateCompanyMutation,
	useUpdateAccountMutation,
	useArchiveCompanyMutation,
	useArchiveAccountMutation,
} = organizationApi;
