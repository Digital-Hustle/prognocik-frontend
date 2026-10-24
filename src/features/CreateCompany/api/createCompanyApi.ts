import type { Company, CompanyRq } from "@/entities/Company";
import { idempotency, orch, rtkApi } from "@/shared/api/rtkApi";

export const createCompanyApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		createCompany: build.mutation<Company, { body: CompanyRq; idempotencyKey: string }>({
			query: ({ body, idempotencyKey }) => ({
				url: orch("/companies"),
				method: "POST",
				body,
				headers: idempotency(idempotencyKey),
			}),
			invalidatesTags: [{ type: "Companies", id: "LIST" }],
		}),
	}),
});

export const { useCreateCompanyMutation } = createCompanyApi;
