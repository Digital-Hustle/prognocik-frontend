import { addDays, todayIso } from "@/shared/lib/date/date";
import type { Account } from "../model/types";

/**
 * Дата среза для расчётов: последний день, по которому у счёта есть данные (latestBalanceDate), но не позже
 * «вчера» (или переданного серверного asOfDate). Выписки могут быть историческими — тогда считаем от их конца,
 * а не от сегодняшнего дня, где данных ещё нет.
 */
export function dataAsOfDate(account: Pick<Account, "latestBalanceDate"> | null | undefined, cap?: string): string {
	const limit = cap ?? addDays(todayIso(), -1);
	const last = account?.latestBalanceDate;
	return last && last < limit ? last : limit;
}
