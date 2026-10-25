import { storage } from "@/shared/lib/storage";

export const DEMO_MODE_KEY = "prognocik.demo-mode";
export const DEMO_COMPANY_ID = "de000000-0000-4000-8000-000000000001";
export const DEMO_ACCOUNT_ID = "de000000-0000-4000-8000-000000000002";

export const isDemoMode = () => storage.get(DEMO_MODE_KEY) === "true";

/** Только интерфейсная настройка. Перезагрузка отменяет запросы и разделяет кэши двух режимов. */
export function setDemoMode(enabled: boolean): boolean {
	storage.set(DEMO_MODE_KEY, String(enabled));
	return isDemoMode() === enabled;
}
