import { companyUrl, rtkApi } from "@/shared/api/rtkApi";
import type { Job } from "../model/types";

export const jobApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getJob: build.query<Job, { companyId: string; jobId: string }>({
			query: ({ companyId, jobId }) => companyUrl(companyId, `/jobs/${jobId}`),
			providesTags: (_rs, _e, { jobId }) => [{ type: "Jobs", id: jobId }],
		}),
		cancelJob: build.mutation<Job, { companyId: string; jobId: string }>({
			query: ({ companyId, jobId }) => ({ url: companyUrl(companyId, `/jobs/${jobId}/cancel`), method: "POST" }),
			invalidatesTags: (_rs, _e, { jobId }) => [{ type: "Jobs", id: jobId }],
		}),
	}),
});

export const { useGetJobQuery, useCancelJobMutation } = jobApi;
