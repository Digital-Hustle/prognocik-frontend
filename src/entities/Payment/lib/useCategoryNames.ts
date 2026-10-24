import { useMemo } from "react";
import { useListCategoriesQuery } from "../api/paymentApi";

/** code → человеческое название из справочника бэка */
export function useCategoryNames(companyId: string) {
	const { data } = useListCategoriesQuery(companyId, { skip: !companyId });
	return useMemo(() => {
		const map = new Map<string, string>();
		data?.items.forEach((c) => map.set(c.code, c.name));
		return (code: string | null | undefined) => (code ? (map.get(code) ?? code) : "—");
	}, [data]);
}
