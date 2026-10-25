import { companyUrl, rtkApi } from "@/shared/api/rtkApi";
import type { PageRs } from "@/shared/api/types";
import type { Employee } from "../model/types";

export const employeeApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		listEmployees: build.query<
			PageRs<Employee>,
			{ companyId: string; includeArchived?: boolean; page?: number; size?: number }
		>({
			query: ({ companyId, includeArchived = false, page = 0, size = 100 }) => ({
				url: companyUrl(companyId, "/employees"),
				params: { includeArchived, page, size },
			}),
			providesTags: (rs, _e, { companyId }) => [
				{ type: "Employees", id: companyId },
				...(rs?.items.map((e) => ({ type: "Employees" as const, id: e.id })) ?? []),
			],
		}),
	}),
});

export const { useListEmployeesQuery } = employeeApi;
