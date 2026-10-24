import { rtkApi } from "@/shared/api/rtkApi";

const AUTH = "/api/v1/auth-profile/auth";

export const sessionsApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		revokeSession: build.mutation<void, string>({
			query: (sessionId) => ({ url: `${AUTH}/sessions/${sessionId}`, method: "DELETE" }),
			invalidatesTags: ["Sessions"],
		}),
		revokeAllSessions: build.mutation<void, void>({
			query: () => ({ url: `${AUTH}/sessions`, method: "DELETE" }),
			invalidatesTags: ["Sessions"],
		}),
	}),
});

export const { useRevokeSessionMutation, useRevokeAllSessionsMutation } = sessionsApi;
