import type { Instant, Uuid } from "@/shared/api/types";

export type JobType = "FORECAST" | "BACKTEST" | "DETECT_RECURRING";
export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

/** JobRs. resultId заполнен только при SUCCEEDED */
export interface Job {
	id: Uuid;
	accountId: Uuid;
	type: JobType;
	status: JobStatus;
	snapshotId: Uuid | null;
	resultId: Uuid | null;
	progress: number;
	attempts: number;
	error: { code?: string; detail?: string; message?: string } | null;
	origin: "MANUAL" | "AUTO";
	createdAt: Instant;
	startedAt: Instant | null;
	finishedAt: Instant | null;
}

export const isJobActive = (status?: JobStatus | null) => status === "QUEUED" || status === "RUNNING";
