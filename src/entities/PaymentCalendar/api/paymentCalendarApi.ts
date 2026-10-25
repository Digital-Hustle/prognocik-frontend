import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { PaymentCalendar } from "../model/types";

export const paymentCalendarApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getPaymentCalendar: build.query<
			PaymentCalendar,
			{ companyId: string; accountId: string; fromDate: string; toDate: string }
		>({
			query: ({ companyId, accountId, fromDate, toDate }) => ({
				url: accountUrl(companyId, accountId, "/payment-calendar"),
				params: { fromDate, toDate },
			}),
			providesTags: (_rs, _e, { accountId }) => [
				{ type: "PaymentCalendar", id: accountId },
				{ type: "Plans", id: accountId },
			],
		}),
	}),
});

export const { useGetPaymentCalendarQuery } = paymentCalendarApi;
