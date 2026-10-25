import type { TaxAudience } from "./types";

export const TAX_AUDIENCE_LABEL: Record<TaxAudience, string> = {
	EMPLOYER: "Работодатель",
	VAT_PAYER: "Плательщик НДС",
	USN: "УСН",
	LEGAL_ENTITY: "Юрлица",
	IP: "ИП",
};
