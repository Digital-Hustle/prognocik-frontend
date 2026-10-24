import type { CodeChallenge } from "@/entities/User";

export type AuthStep = "email" | "code";

export interface AuthByEmailSchema {
	step: AuthStep;
	email: string;
	challenge: CodeChallenge | null;
}
