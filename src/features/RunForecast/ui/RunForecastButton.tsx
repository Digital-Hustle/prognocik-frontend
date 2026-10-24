import { RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useState } from "react";
import type { ForecastScope } from "@/entities/Forecast";
import { SCOPE_LABEL } from "@/entities/Forecast";
import { spring, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { Button } from "@/shared/ui/Button/Button";
import { Progress } from "@/shared/ui/Progress/Progress";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { useRunForecast } from "../model/useRunForecast";

interface RunForecastButtonProps {
	companyId: string;
	accountId: string;
	/** Дата среза: dashboard.asOfDate (вчера в часовом поясе компании) */
	asOfDate: string;
	disabled?: boolean;
	/** Внешний счётчик задачи (автопересчёт с бэка) */
	externalBusy?: boolean;
	label?: string;
	variant?: "brand" | "outline" | "primary";
	className?: string;
	withScope?: boolean;
}

export const RunForecastButton = memo(
	({
		companyId,
		accountId,
		asOfDate,
		disabled,
		externalBusy,
		label = "Пересчитать прогноз",
		variant = "brand",
		className,
		withScope = true,
	}: RunForecastButtonProps) => {
		const [scope, setScope] = useState<ForecastScope>("WITH_KNOWN_PLANS");
		const { run, busy, job } = useRunForecast(companyId, accountId);
		const working = busy || externalBusy;

		return (
			<div className={cn("flex min-w-0 flex-col gap-2", className)}>
				<div className="flex flex-wrap items-center gap-2">
					{withScope && (
						<Segmented
							size="sm"
							value={scope}
							onChange={setScope}
							label="Что учитывать"
							options={[
								{ value: "WITH_KNOWN_PLANS", label: SCOPE_LABEL.WITH_KNOWN_PLANS },
								{ value: "HISTORY_ONLY", label: SCOPE_LABEL.HISTORY_ONLY },
							]}
						/>
					)}
					<Button
						variant={variant}
						disabled={disabled || working}
						onClick={() => void run(asOfDate, scope)}
					>
						<motion.span
							className="flex"
							animate={working ? { rotate: 360 } : { rotate: 0 }}
							transition={working ? { duration: 1, ease: "linear", repeat: Infinity } : spring.snappy}
						>
							<RefreshCw />
						</motion.span>
						{working ? "Считаем…" : label}
					</Button>
				</div>
				<AnimatePresence>
					{working && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0, transition: tween.exit }}
							transition={spring.glide}
						>
							<Progress
								value={job ? Math.max(0.08, job.progress / 100) : 0.08}
								tone="brand"
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}
);
