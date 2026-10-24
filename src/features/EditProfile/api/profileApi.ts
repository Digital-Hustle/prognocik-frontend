import type { Profile } from "@/entities/User";
import { rtkApi } from "@/shared/api/rtkApi";

export const profileApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		updateProfile: build.mutation<Profile, { displayName: string; version: number }>({
			query: (body) => ({ url: "/api/v1/auth-profile/profile/me", method: "PUT", body }),
			invalidatesTags: ["Profile"],
		}),
	}),
});

export const { useUpdateProfileMutation } = profileApi;
