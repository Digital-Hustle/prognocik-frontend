import type { LegalForm, Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
	OWNER: "Владелец",
	ACCOUNTANT: "Бухгалтер",
	VIEWER: "Наблюдатель",
};

export const LEGAL_FORM_LABEL: Record<LegalForm, string> = {
	OOO: "ООО",
	IP: "ИП",
	OTHER: "Другое",
};
