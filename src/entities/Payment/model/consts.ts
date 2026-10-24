import type { CategorySource } from "./types";

export const CATEGORY_SOURCE_LABEL: Record<string, string> = {
	RULE: "по правилу",
	COUNTERPARTY: "по контрагенту",
	USER: "вручную",
	OTHER: "не определено",
} satisfies Partial<Record<CategorySource, string>>;
