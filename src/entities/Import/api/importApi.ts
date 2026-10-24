import { companyUrl, rtkApi } from "@/shared/api/rtkApi";
import type { PageRs } from "@/shared/api/types";
import type { ImportIssue, StatementImport } from "../model/types";

export const importApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		listImports: build.query<PageRs<StatementImport>, { companyId: string; accountId: string }>({
			query: ({ companyId, accountId }) => ({
				url: companyUrl(companyId, "/imports"),
				params: { accountId, size: 50 },
			}),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Imports", id: accountId }],
		}),
		getImport: build.query<StatementImport, { companyId: string; importId: string }>({
			query: ({ companyId, importId }) => companyUrl(companyId, `/imports/${importId}`),
			providesTags: (_rs, _e, { importId }) => [{ type: "Imports", id: importId }],
		}),
		listImportIssues: build.query<PageRs<ImportIssue>, { companyId: string; importId: string; severity?: string }>({
			query: ({ companyId, importId, severity }) => ({
				url: companyUrl(companyId, `/imports/${importId}/issues`),
				params: severity ? { severity, size: 200 } : { size: 200 },
			}),
			providesTags: (_rs, _e, { importId }) => [{ type: "Imports", id: importId }],
		}),
	}),
});

export const { useListImportsQuery, useGetImportQuery, useListImportIssuesQuery } = importApi;
