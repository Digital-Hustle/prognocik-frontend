import { orch, rtkApi } from "@/shared/api/rtkApi";
import type { CompaniesImportRs, OperationsImportRs } from "../model/types";

const form = (file: File) => {
	const body = new FormData();
	body.append("file", file);
	return body;
};

/**
 * Массовая загрузка организаторов: companies.csv и all_operations.csv одним файлом на все компании.
 * Оба импорта атомарные: при ошибке не сохраняется ничего, поэтому повтор безопасен, но делает его пользователь.
 */
export const bulkImportApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		importCompaniesCsv: build.mutation<CompaniesImportRs, File>({
			query: (file) => ({ url: orch("/companies/imports"), method: "POST", body: form(file) }),
			invalidatesTags: [{ type: "Companies", id: "LIST" }],
		}),
		importOperationsCsv: build.mutation<OperationsImportRs, File>({
			query: (file) => ({ url: orch("/companies/operations/imports"), method: "POST", body: form(file) }),
			invalidatesTags: [
				{ type: "Companies", id: "LIST" },
				{ type: "Accounts" },
				{ type: "Payments" },
				{ type: "DailyHistory" },
				{ type: "DataQuality" },
				{ type: "Dashboard" },
			],
		}),
	}),
});

export const { useImportCompaniesCsvMutation, useImportOperationsCsvMutation } = bulkImportApi;
