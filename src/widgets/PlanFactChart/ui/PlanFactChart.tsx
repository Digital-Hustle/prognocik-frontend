import { motion } from "motion/react";
import { memo, useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { PlanFact } from "@/entities/PlanFact";
import { fadeUp } from "@/shared/config/motion";
import { cssVar } from "@/shared/config/tokens";
import { formatDayShort } from "@/shared/lib/date/date";
import { formatCompact, formatMoney, toNumber } from "@/shared/lib/format/money";

interface PlanFactChartProps {
	data: PlanFact;
	direction: "IN" | "OUT";
	height?: number;
}

const axis = { stroke: cssVar("muted-foreground"), fontSize: 12, tickLine: false, axisLine: false } as const;

/** План и факт по периодам: план — приглушённый столбец, факт — цветной; будущие периоды факта не имеют */
export const PlanFactChart = memo(({ data, direction, height = 300 }: PlanFactChartProps) => {
	const rows = useMemo(
		() =>
			data.periods.map((p) => ({
				label:
					data.groupBy === "WEEK"
						? `${formatDayShort(p.periodStart)}–${formatDayShort(p.periodEnd)}`
						: formatDayShort(p.periodStart),
				start: p.periodStart,
				future: p.periodStart > data.today,
				plan: toNumber(direction === "IN" ? p.plannedIn : p.plannedOut) ?? 0,
				fact: toNumber(direction === "IN" ? p.actualIn : p.actualOut) ?? 0,
				variance: toNumber(direction === "IN" ? p.varianceIn : p.varianceOut) ?? 0,
				unplanned: toNumber(direction === "IN" ? p.unplannedIn : p.unplannedOut) ?? 0,
			})),
		[data, direction]
	);
	const factColor = direction === "IN" ? cssVar("chart-in") : cssVar("chart-out");
	const todayLabel = rows.find((r) => r.start >= data.today)?.label;

	return (
		<motion.div
			variants={fadeUp}
			initial="hidden"
			animate="show"
			style={{ height }}
		>
			<ResponsiveContainer>
				<BarChart
					data={rows}
					margin={{ top: 12, right: 8, left: 4, bottom: 0 }}
					barGap={2}
				>
					<CartesianGrid
						stroke={cssVar("chart-grid")}
						vertical={false}
					/>
					<XAxis
						dataKey="label"
						{...axis}
						minTickGap={16}
					/>
					<YAxis
						{...axis}
						width={60}
						tickFormatter={(v: number) => formatCompact(v)}
					/>
					<Tooltip
						cursor={{ fill: cssVar("muted") }}
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;
							const r = payload[0].payload as (typeof rows)[number];
							return (
								<div className="min-w-44 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-pop">
									<div className="mb-1 font-medium">{r.label}</div>
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">План</span>
										<span className="tabular-nums">{formatMoney(r.plan)}</span>
									</div>
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">Факт</span>
										<span className="tabular-nums">{r.future ? "—" : formatMoney(r.fact)}</span>
									</div>
									{!r.future && (
										<div className="flex justify-between gap-4">
											<span className="text-muted-foreground">Отклонение</span>
											<span
												className={r.variance < 0 ? "text-danger tabular-nums" : "tabular-nums"}
											>
												{formatMoney(r.variance)}
											</span>
										</div>
									)}
									{r.unplanned > 0 && (
										<div className="flex justify-between gap-4">
											<span className="text-muted-foreground">Вне плана</span>
											<span className="tabular-nums">{formatMoney(r.unplanned)}</span>
										</div>
									)}
								</div>
							);
						}}
					/>
					{todayLabel && (
						<ReferenceLine
							x={todayLabel}
							stroke={cssVar("border-strong")}
							strokeDasharray="3 3"
						/>
					)}
					<Bar
						dataKey="plan"
						name="План"
						fill={cssVar("chart-plan")}
						fillOpacity={0.35}
						radius={[6, 6, 0, 0]}
						animationDuration={700}
					/>
					<Bar
						dataKey="fact"
						name="Факт"
						radius={[6, 6, 0, 0]}
						animationDuration={900}
					>
						{rows.map((r) => (
							<Cell
								key={r.start}
								fill={r.variance < 0 && r.plan > 0 ? cssVar("chart-lime") : factColor}
								fillOpacity={r.future ? 0 : 1}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</motion.div>
	);
});
