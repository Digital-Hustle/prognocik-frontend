import { rtkApi } from "@/shared/api/rtkApi";
import type { Profile, SessionsRs } from "../model/types";

const AUTH = "/api/v1/auth-profile";

export const userApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		getMe: build.query<Profile, void>({
			query: () => `${AUTH}/profile/me`,
			providesTags: ["Profile"],
		}),
		getSessions: build.query<SessionsRs, void>({
			query: () => `${AUTH}/auth/sessions`,
			providesTags: ["Sessions"],
		}),
	}),
});

export const { useGetMeQuery, useLazyGetMeQuery, useGetSessionsQuery } = userApi;
