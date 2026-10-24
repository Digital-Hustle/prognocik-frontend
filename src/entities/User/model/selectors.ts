import type { UserSchema } from "./types";

type WithUser = { user: UserSchema };

export const getUserAuthData = (state: WithUser) => state.user.authData;
export const getUserInited = (state: WithUser) => state.user.inited;
