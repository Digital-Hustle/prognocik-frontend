import { useCallback, useState } from "react";
import type { ForecastScope } from "@/entities/Forecast";
import { useJobWatcher } from "@/entities/Job";
import type { Job } from "@/entities/Job";
import { problemMessage } from "@/shared/api/problem";
import { rtkApi } from "@/shared/api/rtkApi";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateForecastJobMutation } from "../api/runForecastApi";

/**
 * Составной flow прогноза: POST /forecast-jobs → polling /jobs/{id} → обновить dashboard и списки.
 * Старый результат не стираем, пока считается новый (гайд, CLIENT_HANDOFF).
 */
export function useRunForecast(companyId: string, accountId: string, onDone?: (job: Job) => void) {
	const dispatch = useAppDispatch();
	const [create, createState] = useCreateForecastJobMutation();
	const idem = useIdempotencyKey();
	const [jobId, setJobId] = useState<string | null>(null);

	const { job, active } = useJobWatcher({
		companyId,
		jobId,
		onFinish: (j) => {
			if (j.status === "SUCCEEDED") {
				dispatch(
					rtkApi.util.invalidateTags([
						{ type: "Dashboard", id: accountId },
						{ type: "Forecasts", id: accountId },
						{ type: "Alerts", id: accountId },
						{ type: "PlanFact", id: accountId },
					])
				);
				toast.success("Прогноз пересчитан");
			} else if (j.status === "FAILED") {
				toast.error(j.error?.detail || j.error?.message || `Расчёт не удался: ${j.error?.code ?? "ошибка"}`);
			}
			onDone?.(j);
		},
	});

	const run = useCallback(
		async (asOfDate: string, scope: ForecastScope) => {
			const body = { companyId, accountId, asOfDate, scope };
			const rs = await create({ ...body, idempotencyKey: idem.get(body) });
			if ("data" in rs && rs.data) {
				idem.done();
				setJobId(rs.data.id);
			} else {
				toast.error(problemMessage(rs.error, "Не удалось запустить расчёт"));
			}
		},
		[accountId, companyId, create, idem]
	);

	return { run, job, busy: createState.isLoading || active };
}
