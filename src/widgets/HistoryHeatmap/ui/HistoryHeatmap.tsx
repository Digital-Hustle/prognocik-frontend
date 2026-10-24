import { motion } from "motion/react";
import { memo, useMemo } from "react";
import type { DailyActual } from "@/entities/AccountHistory";
import { spring } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { formatWeekday, parseIsoDate } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";

interface HistoryHeatmapProps {
	days: DailyActual[];
	className?: string;
}

const CLS: Record<string, string> = {
	OBSERVED: "bg-brand",
	ZERO_CONFIRMED: "bg-info-border",
	MISSING: "bg-warning-border",
};

/** Полнота истории по дням: столбцы — недели, строки — дни недели. MISSING — не ноль, а отсутствие данных. */
export const HistoryHeatmap = memo(({ days, className }: HistoryHeatmapProps) => {
	const weeks = useMemo(() => {
		if (!days.length) return [] as (DailyActual | null)[][];
		const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
		const firstDow = (parseIsoDate(sorted[0].date).getDay() + 6) % 7;
		const cells: (DailyActual | null)[] = [...Array<null>(firstDow).fill(null), ...sorted];
		const out: (DailyActual | null)[][] = [];
		for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
		return out;
	}, [days]);

	return (
		<div className={cn("overflow-x-auto", className)}>
			<div className="flex gap-1">
				<div className="mr-1 flex flex-col gap-1 text-[10px] leading-3 text-subtle-foreground">
					{["пн", "", "ср", "", "пт", "", "вс"].map((d, i) => (
						<span
							key={i}
							className="h-3"
						>
							{d}
						</span>
					))}
				</div>
				{weeks.map((w, wi) => (
					<div
						key={wi}
						className="flex flex-col gap-1"
					>
						{Array.from({ length: 7 }, (_, di) => {
							const d = w[di];
							return d ? (
								<motion.span
									key={d.date}
									title={`${formatWeekday(d.date)}: ${
										d.status === "MISSING"
											? "нет данных"
											: d.status === "ZERO_CONFIRMED"
												? "подтверждён пустым"
												: `${d.paymentCount} опер., остаток ${formatMoney(d.balanceEod)}`
									}${d.balanceMismatch ? " · расхождение остатка" : ""}`}
									initial={{ scale: 0, opacity: 0 }}
									animate={{
										scale: 1,
										opacity: d.status === "OBSERVED" ? Math.min(1, 0.45 + d.paymentCount / 12) : 1,
									}}
									transition={{ ...spring.pop, delay: Math.min(0.6, wi * 0.012) }}
									className={cn(
										"size-3 rounded-[3px]",
										CLS[d.status],
										d.balanceMismatch && "ring-1 ring-danger ring-offset-1 ring-offset-card"
									)}
								/>
							) : (
								<span
									key={di}
									className="size-3"
								/>
							);
						})}
					</div>
				))}
			</div>
			<div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<span className="size-3 rounded-[3px] bg-brand" />
					есть операции
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-3 rounded-[3px] bg-info-border" />
					подтверждён пустым
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-3 rounded-[3px] bg-warning-border" />
					нет данных
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-3 rounded-[3px] ring-1 ring-danger" />
					расхождение остатка
				</span>
			</div>
		</div>
	);
});
