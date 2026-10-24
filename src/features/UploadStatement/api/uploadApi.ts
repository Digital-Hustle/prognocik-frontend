import type { StatementImport, ValidationMode } from "@/entities/Import";
import { idempotency, rtkApi } from "@/shared/api/rtkApi";

export interface UploadStatementArgs {
	companyId: string;
	accountId: string;
	file: File;
	validationMode: ValidationMode;
	completeness: "UNKNOWN" | "CONFIRMED_COMPLETE";
	declaredFromDate?: string;
	declaredToDate?: string;
	idempotencyKey: string;
}

/** Публичный upload Preprocessor: подготовка CSV + staging + finalize одним запросом. 201 = данные сохранены. */
export const uploadApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		uploadStatement: build.mutation<StatementImport, UploadStatementArgs>({
			query: ({
				companyId,
				accountId,
				file,
				validationMode,
				completeness,
				declaredFromDate,
				declaredToDate,
				idempotencyKey,
			}) => {
				const form = new FormData();
				form.append("file", file);
				form.append("accountId", accountId);
				form.append("validationMode", validationMode);
				form.append("completeness", completeness);
				if (completeness === "CONFIRMED_COMPLETE" && declaredFromDate && declaredToDate) {
					form.append("declaredFromDate", declaredFromDate);
					form.append("declaredToDate", declaredToDate);
				}
				return {
					url: `/api/v1/preprocessor/companies/${companyId}/imports`,
					method: "POST",
					body: form,
					headers: idempotency(idempotencyKey),
				};
			},
			// Импорт меняет dataVersion: история, операции, качество и прогноз (STALE) нужно перечитать
			invalidatesTags: (_rs, _e, { accountId, companyId }) => [
				{ type: "Imports", id: accountId },
				{ type: "Payments", id: accountId },
				{ type: "DailyHistory", id: accountId },
				{ type: "DataQuality", id: accountId },
				{ type: "Completeness", id: accountId },
				{ type: "Dashboard", id: accountId },
				{ type: "PlanFact", id: accountId },
				{ type: "Accounts", id: companyId },
				{ type: "Accounts", id: accountId },
			],
		}),
	}),
});

export const { useUploadStatementMutation } = uploadApi;
