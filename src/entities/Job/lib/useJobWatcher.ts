import { useEffect, useRef, useState } from "react";
import { motionTokens } from "@/shared/config/motion";
import { useGetJobQuery } from "../api/jobApi";
import { isJobActive } from "../model/types";
import type { Job } from "../model/types";

interface UseJobWatcherOptions {
	companyId: string;
	jobId: string | null | undefined;
	/** Вызывается один раз, когда задача пришла в конечный статус */
	onFinish?: (job: Job) => void;
}

/**
 * Опрос фонового расчёта (POST …-jobs → 202 JobRs → GET /jobs/{id}). Раз в ~800 мс, пока QUEUED/RUNNING;
 * останавливается на SUCCEEDED/FAILED/CANCELLED и при уходе с экрана (RTK Query снимает подписку).
 */
export function useJobWatcher({ companyId, jobId, onFinish }: UseJobWatcherOptions) {
	const [polling, setPolling] = useState(true);
	const { data, error } = useGetJobQuery(
		{ companyId, jobId: jobId ?? "" },
		{ skip: !jobId, pollingInterval: polling ? motionTokens.poll.jobMs : 0, skipPollingIfUnfocused: false }
	);
	const job = jobId && data?.id === jobId ? data : undefined;
	const done = useRef<string | null>(null);
	const cb = useRef(onFinish);
	cb.current = onFinish;

	useEffect(() => {
		setPolling(true);
	}, [jobId]);

	useEffect(() => {
		if (!job || !jobId || isJobActive(job.status) || done.current === jobId) return;
		done.current = jobId;
		setPolling(false);
		cb.current?.(job);
	}, [job, jobId]);

	return { job, active: Boolean(jobId) && (!job || isJobActive(job.status)), error };
}
