import type { Instant, IsoDate, Money, Uuid } from "@/shared/api/types";

export type Role = "OWNER" | "ACCOUNTANT" | "VIEWER";
export type LegalForm = "OOO" | "IP" | "OTHER";

/** PermissionsRs: VIEWER читает, но не импортирует, не меняет категории/планы/регулярности и не запускает расчёты */
export interface Permissions {
	canEditCompany: boolean;
	canManageMembers: boolean;
	canImport: boolean;
	canEditPayments: boolean;
	canManagePlans: boolean;
	canRunForecast: boolean;
	canRunBacktest: boolean;
}

/** CompanyRs */
export interface Company {
	id: Uuid;
	name: string;
	legalForm: LegalForm | null;
	inn: string | null;
	kpp: string | null;
	timezone: string;
	ownerUserId: Uuid;
	myRole: Role;
	permissions: Permissions;
	archived: boolean;
	dataVersion: number;
	version: number;
	createdAt: Instant;
	updatedAt: Instant;
}

/** CompanyRq */
export interface CompanyRq {
	name: string;
	legalForm?: LegalForm | null;
	inn?: string | null;
	kpp?: string | null;
	timezone?: string | null;
}

/** AccountRs */
export interface Account {
	id: Uuid;
	companyId: Uuid;
	name: string;
	bankName: string | null;
	accountNumber: string | null;
	externalCompanyId: string | null;
	currency: string;
	archived: boolean;
	latestBalance: Money | null;
	latestBalanceDate: IsoDate | null;
	version: number;
	createdAt: Instant;
	updatedAt: Instant;
}

/** AccountRq */
export interface AccountRq {
	name: string;
	bankName?: string | null;
	accountNumber?: string | null;
	externalCompanyId?: string | null;
}

/** MemberRs */
export interface Member {
	userId: Uuid;
	role: Role;
	version: number;
	joinedAt: Instant;
}
