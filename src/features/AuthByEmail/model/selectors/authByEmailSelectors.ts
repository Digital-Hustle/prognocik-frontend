import type { AuthByEmailSchema } from "../types/authByEmailSchema";

type WithAuth = { authByEmail?: AuthByEmailSchema };

export const getAuthStep = (state: WithAuth) => state.authByEmail?.step ?? "email";
export const getAuthEmail = (state: WithAuth) => state.authByEmail?.email ?? "";
export const getAuthChallenge = (state: WithAuth) => state.authByEmail?.challenge ?? null;
