import type { Uuid } from "@/shared/api/types";

/** Выбранные компания и счёт. Все финансовые запросы явно содержат оба id. */
export interface WorkspaceSchema {
	companyId: Uuid | null;
	accountId: Uuid | null;
}
