import type { AuthSession, CodeChallenge } from "@/entities/User";
import { resetCsrf } from "@/shared/api/csrf";
import { rtkApi } from "@/shared/api/rtkApi";

const AUTH = "/api/v1/auth-profile/auth";

export const authApi = rtkApi.injectEndpoints({
	endpoints: (build) => ({
		requestCode: build.mutation<CodeChallenge, { email: string }>({
			query: (body) => ({ url: `${AUTH}/code`, method: "POST", body }),
		}),
		verifyCode: build.mutation<AuthSession, { challengeId: string; code: string }>({
			query: (body) => ({ url: `${AUTH}/verify`, method: "POST", body }),
			// verify выставляет новые access/refresh/CSRF cookies — старый CSRF-токен больше не годится
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

export const { useRequestCodeMutation, useVerifyCodeMutation } = authApi;
