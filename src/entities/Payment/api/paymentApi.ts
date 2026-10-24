import { accountUrl, companyUrl, rtkApi } from "@/shared/api/rtkApi";
import type { ItemsRs, PageRs } from "@/shared/api/types";
import type { Category, CategoryRevision, Counterparty, Payment, PaymentFilters } from "../model/types";

interface AccountArgs {
	companyId: string;
	accountId: string;
}

const clean = (params: object) =>
	Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const paymentApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		listPayments: build.query<PageRs<Payment>, AccountArgs & PaymentFilters>({
			query: ({ companyId, accountId, ...filters }) => ({
				url: accountUrl(companyId, accountId, "/payments"),
				params: clean(filters),
			}),
			providesTags: (rs, _e, { accountId }) => [
				{ type: "Payments", id: accountId },
				...(rs?.items.map((p) => ({ type: "Payments" as const, id: p.id })) ?? []),
			],
		}),
		getPayment: build.query<Payment, AccountArgs & { paymentId: string }>({
			query: ({ companyId, accountId, paymentId }) => accountUrl(companyId, accountId, `/payments/${paymentId}`),
			providesTags: (_rs, _e, { paymentId }) => [{ type: "Payments", id: paymentId }],
		}),
		listPaymentRevisions: build.query<ItemsRs<CategoryRevision>, AccountArgs & { paymentId: string }>({
			query: ({ companyId, accountId, paymentId }) =>
				accountUrl(companyId, accountId, `/payments/${paymentId}/revisions`),
			providesTags: (_rs, _e, { paymentId }) => [{ type: "Payments", id: paymentId }],
		}),
		listCategories: build.query<ItemsRs<Category>, string>({
			query: (companyId) => companyUrl(companyId, "/categories"),
			providesTags: ["Categories"],
			keepUnusedDataFor: 3600,
		}),
		listCounterparties: build.query<PageRs<Counterparty>, AccountArgs & { q?: string }>({
			query: ({ companyId, accountId, q }) => ({
				url: companyUrl(companyId, "/counterparties"),
				params: clean({ accountId, q, size: 20 }),
			}),
			providesTags: ["Counterparties"],
		}),
	}),
});

export const {
	useListPaymentsQuery,
	useGetPaymentQuery,
	useListPaymentRevisionsQuery,
	useListCategoriesQuery,
	useListCounterpartiesQuery,
} = paymentApi;
