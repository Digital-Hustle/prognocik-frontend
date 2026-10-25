/** CompanyCsvImportService.ImportResult */
export interface CompaniesImportRs {
	total: number;
	created: number;
	existing: number;
	companies: { externalCompanyId: string; companyId: string; status: "CREATED" | "EXISTING" }[];
}

/** RawOperationsImportService: итог загрузки all_operations.csv */
export interface OperationsImportRs {
	companies: number;
	inserted: number;
	existing: number;
	items: {
		externalCompanyId: string;
		companyId: string;
		accountId: string;
		inserted: number;
		existing: number;
	}[];
}

export const MAX_COMPANIES_BYTES = 2 * 1024 * 1024;
export const MAX_OPERATIONS_BYTES = 100 * 1024 * 1024;
