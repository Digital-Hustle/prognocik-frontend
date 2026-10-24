import { resetCsrf } from "@/shared/api/csrf";
import { rtkApi } from "@/shared/api/rtkApi";

export const logoutApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		logout: build.mutation<void, void>({
			query: () => ({ url: "/api/v1/auth-profile/auth/logout", method: "POST" }),
			async onQueryStarted(_arg, { queryFulfilled }) {
				try {
					await queryFulfilled;
				} finally {
					resetCsrf();
				}
			},
		}),
	}),
});

export const { useLogoutMutation } = logoutApi;
