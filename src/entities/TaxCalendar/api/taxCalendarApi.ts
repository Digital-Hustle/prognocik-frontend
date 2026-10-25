import { companyUrl, rtkApi } from "@/shared/api/rtkApi";
import type { TaxCalendar } from "../model/types";

export const taxCalendarApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getTaxCalendar: build.query<TaxCalendar, { companyId: string; year: number }>({
			query: ({ companyId, year }) => ({ url: companyUrl(companyId, "/tax-calendar"), params: { year } }),
			providesTags: (_rs, _e, { companyId, year }) => [{ type: "TaxCalendar", id: `${companyId}:${year}` }],
		}),
	}),
});

export const { useGetTaxCalendarQuery } = taxCalendarApi;
