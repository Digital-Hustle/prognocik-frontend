import { accountUrl, rtkApi } from "@/shared/api/rtkApi";
import type { BitrixStatus } from "../model/types";

export const bitrixApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getBitrixStatus: build.query<BitrixStatus, { companyId: string; accountId: string }>({
			query: ({ companyId, accountId }) => accountUrl(companyId, accountId, "/integrations/bitrix24"),
			providesTags: (_rs, _e, { accountId }) => [{ type: "Integrations", id: accountId }],
		}),
	}),
});

export const { useGetBitrixStatusQuery } = bitrixApi;
