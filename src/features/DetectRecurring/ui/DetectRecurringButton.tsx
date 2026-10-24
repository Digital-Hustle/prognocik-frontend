import { ScanSearch } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useState } from "react";
import { useJobWatcher } from "@/entities/Job";
import { problemMessage } from "@/shared/api/problem";
import { rtkApi } from "@/shared/api/rtkApi";
import { spring, tween } from "@/shared/config/motion";
import { addDays, todayIso } from "@/shared/lib/date/date";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { Progress } from "@/shared/ui/Progress/Progress";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateDetectionJobMutation } from "../api/detectRecurringApi";

interface DetectRecurringButtonProps {
	companyId: string;
	accountId: string;
	disabled?: boolean;
	variant?: "brand" | "outline" | "primary";
	label?: string;
}

/** Поиск регулярностей: POST recurring-detection-jobs → polling → GET recurring-patterns */
export const DetectRecurringButton = memo(
	({
		companyId,
		accountId,
		disabled,
		variant = "brand",
		label = "Найти регулярные платежи",
	}: DetectRecurringButtonProps) => {
		const dispatch = useAppDispatch();
		const [create, state] = useCreateDetectionJobMutation();
		const idem = useIdempotencyKey();
		const [jobId, setJobId] = useState<string | null>(null);
		const { job, active } = useJobWatcher({
			companyId,
			jobId,
			onFinish: (j) => {
				if (j.status === "SUCCEEDED") {
					dispatch(rtkApi.util.invalidateTags([{ type: "Recurring", id: accountId }]));
					toast.success("Поиск завершён — проверьте найденные платежи");
				} else if (j.status === "FAILED") {
					toast.error(j.error?.detail || j.error?.message || `Поиск не удался: ${j.error?.code ?? "ошибка"}`);
				}
			},
		});
		const busy = state.isLoading || active;

		const start = async () => {
			// Срез — вчера: сегодняшний день ещё не закрыт выпиской
			const body = { companyId, accountId, asOfDate: addDays(todayIso(), -1) };
			const rs = await create({ ...body, idempotencyKey: idem.get(body) });
			if ("data" in rs && rs.data) {
				idem.done();
				setJobId(rs.data.id);
			} else toast.error(problemMessage(rs.error, "Не удалось запустить поиск"));
		};

		return (
			<div className="flex min-w-0 flex-col gap-2">
				<Button
					variant={variant}
					disabled={disabled || busy}
					onClick={() => void start()}
				>
					<ScanSearch />
					{busy ? "Ищем закономерности…" : label}
				</Button>
				<AnimatePresence>
					{busy && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0, transition: tween.exit }}
							transition={spring.glide}
						>
							<Progress value={job ? Math.max(0.08, job.progress / 100) : 0.08} />
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}
);
