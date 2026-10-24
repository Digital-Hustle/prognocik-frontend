import type { Instant, Uuid } from "@/shared/api/types";

/** ProfileRs (auth-profile) */
export interface Profile {
	id: Uuid;
	email: string;
	displayName: string | null;
	version: number;
	createdAt: Instant;
	updatedAt: Instant;
}

/** AuthSessionRs — ответ verify/refresh */
export interface AuthSession {
	sessionId: Uuid;
	accessExpiresAt: Instant;
	refreshExpiresAt: Instant;
	user: Profile;
}

/** CodeChallengeRs — ответ POST /auth/code */
export interface CodeChallenge {
	challengeId: Uuid;
	expiresAt: Instant;
	resendAvailableAt: Instant;
	codeLength: number;
}

/** SessionRs */
export interface UserSession {
	id: Uuid;
	createdAt: Instant;
	lastSeenAt: Instant;
	expiresAt: Instant;
	current: boolean;
}

export interface SessionsRs {
	items: UserSession[];
	total: number;
}

export interface UserSchema {
	authData: Profile | null;
	/** Проверка сессии при старте завершена */
	inited: boolean;
}
