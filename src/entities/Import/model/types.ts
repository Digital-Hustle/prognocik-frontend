import type { Instant, IsoDate, Uuid } from "@/shared/api/types";

export type ImportStatus = "RECEIVING" | "STAGING" | "COMMITTED" | "PARTIAL" | "REJECTED" | "ABORTED" | (string & {});
export type ValidationMode = "ATOMIC" | "SKIP_INVALID";

/** ImportRs (Preprocessor и Orchestrator отдают одну форму) */
export interface StatementImport {
	id: Uuid;
	companyId: Uuid;
	accountId: Uuid;
	status: ImportStatus;
	fileName: string | null;
	fileSha256: string | null;
	totalRows: number;
	acceptedRows: number;
	rejectedRows: number;
	duplicateRows: number;
	warningCount: number;
	fromDate: IsoDate | null;
	toDate: IsoDate | null;
	createdAt: Instant;
	completedAt: Instant | null;
	dataVersion: number | null;
}

/** ImportIssueRs */
export interface ImportIssue {
	id: Uuid;
	severity: "INFO" | "WARNING" | "ERROR";
	code: string;
	rowNumber: number | null;
	field: string | null;
	message: string;
}
