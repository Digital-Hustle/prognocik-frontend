import { FlaskConical } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ForecastScope } from "@/entities/Forecast";
import { SCOPE_LABEL } from "@/entities/Forecast";
import { useJobWatcher } from "@/entities/Job";
import { problemMessage } from "@/shared/api/problem";
import { rtkApi } from "@/shared/api/rtkApi";
import { spring, tween } from "@/shared/config/motion";
import { addDays, diffDays, todayIso } from "@/shared/lib/date/date";
import { plural } from "@/shared/lib/format/plural";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { DatePicker } from "@/shared/ui/DatePicker/DatePicker";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Progress } from "@/shared/ui/Progress/Progress";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Switch } from "@/shared/ui/Switch/Switch";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateBacktestJobMutation } from "../api/runBacktestApi";
import type { BacktestRq } from "../api/runBacktestApi";

interface RunBacktestFormProps {
	companyId: string;
	accountId: string;
	/** Окно истории из настроек прогноза */
	windowWeeks: number;
	horizonDays: number;
	disabled?: boolean;
	onFinished?: (backtestId: string) => void;
}

/**
 * Временная кросс-валидация: модель «откатывается» на прошлые даты-отсечки, строит прогноз и сравнивает его с
 * фактом. Отсечка + горизонт должны помещаться до даты среза.
 */
export const RunBacktestForm = memo(
	({ companyId, accountId, windowWeeks, horizonDays, disabled, onFinished }: RunBacktestFormProps) => {
		const dispatch = useAppDispatch();
		const [create, state] = useCreateBacktestJobMutation();
		const idem = useIdempotencyKey();
		const yesterday = addDays(todayIso(), -1);
		const [lastOrigin, setLastOrigin] = useState(addDays(yesterday, -horizonDays));
		const [firstOrigin, setFirstOrigin] = useState(addDays(yesterday, -horizonDays - 7 * 11));
		const [stepDays, setStepDays] = useState(7);
		const [scope, setScope] = useState<ForecastScope>("HISTORY_ONLY");
		const [evaluateRisk, setEvaluateRisk] = useState(true);
		const [jobId, setJobId] = useState<string | null>(null);

		const origins = useMemo(
			() => Math.max(0, Math.floor(diffDays(firstOrigin, lastOrigin) / Math.max(1, stepDays)) + 1),
			[firstOrigin, lastOrigin, stepDays]
		);

		const { job, active } = useJobWatcher({
			companyId,
			jobId,
			onFinish: (j) => {
				if (j.status === "SUCCEEDED") {
					dispatch(
						rtkApi.util.invalidateTags([
							{ type: "Backtests", id: accountId },
							{ type: "Dashboard", id: accountId },
						])
					);
					toast.success("Проверка качества готова");
					if (j.resultId) onFinished?.(j.resultId);
				} else if (j.status === "FAILED") {
					toast.error(
						j.error?.detail || j.error?.message || `Проверка не удалась: ${j.error?.code ?? "ошибка"}`
					);
				}
			},
		});
		const busy = state.isLoading || active;

		const onSubmit = async (e: FormEvent) => {
			e.preventDefault();
			if (firstOrigin > lastOrigin) {
				toast.error("Первая отсечка должна быть не позже последней");
				return;
			}
			const body: BacktestRq = {
				asOfDate: yesterday,
				firstOrigin,
				lastOrigin,
				stepDays,
				scope,
				windowWeeks,
				evaluateRisk,
			};
			const rs = await create({ companyId, accountId, body, idempotencyKey: idem.get(body) });
			if ("data" in rs && rs.data) {
				idem.done();
				setJobId(rs.data.id);
			} else toast.error(problemMessage(rs.error, "Не удалось запустить проверку"));
		};

		return (
			<form
				onSubmit={onSubmit}
				className="flex flex-col gap-4"
			>
				<div className="grid gap-4">
					<Field label="Первая отсечка">
						<DatePicker
							value={firstOrigin}
							max={lastOrigin}
							onChange={setFirstOrigin}
						/>
					</Field>
					<Field
						label="Последняя отсечка"
						hint={`Не позже ${horizonDays} дней до вчера`}
					>
						<DatePicker
							value={lastOrigin}
							max={addDays(yesterday, -horizonDays)}
							onChange={setLastOrigin}
						/>
					</Field>
				</div>
				<div className="grid gap-4">
					<Field
						label="Шаг между отсечками, дней"
						hint="От 7 до 30"
					>
						<Input
							type="number"
							min={7}
							max={30}
							value={stepDays}
							onChange={(e) => setStepDays(Math.min(30, Math.max(7, Number(e.target.value) || 7)))}
						/>
					</Field>
					<div className="flex flex-col gap-1.5">
						<span className="text-sm font-medium">Что учитывать</span>
						<Segmented
							block
							size="sm"
							value={scope}
							onChange={setScope}
							label="Что учитывать"
							options={[
								{ value: "HISTORY_ONLY", label: SCOPE_LABEL.HISTORY_ONLY },
								{ value: "WITH_KNOWN_PLANS", label: SCOPE_LABEL.WITH_KNOWN_PLANS },
							]}
						/>
					</div>
				</div>
				<label className="flex items-center gap-3 rounded-md bg-muted px-3 py-3">
					<span className="min-w-0 flex-1">
						<span className="block text-sm font-medium">Оценить калибровку вероятности</span>
						<span className="block text-xs text-muted-foreground">
							Brier score и покрытие 80%-интервала — дольше считается
						</span>
					</span>
					<Switch
						checked={evaluateRisk}
						onChange={setEvaluateRisk}
						label="Оценить вероятность"
					/>
				</label>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<span className="text-sm text-muted-foreground">
						{origins} {plural(origins, "отсечка", "отсечки", "отсечек")} · окно {windowWeeks}{" "}
						{plural(windowWeeks, "неделя", "недели", "недель")}
					</span>
					<Button
						type="submit"
						variant="brand"
						disabled={disabled || busy || origins === 0}
					>
						<FlaskConical />
						{busy ? "Проверяем…" : "Проверить точность"}
					</Button>
				</div>
				<AnimatePresence>
					{busy && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0, transition: tween.exit }}
							transition={spring.glide}
						>
							<Progress value={job ? Math.max(0.06, job.progress / 100) : 0.06} />
						</motion.div>
					)}
				</AnimatePresence>
			</form>
		);
	}
);
