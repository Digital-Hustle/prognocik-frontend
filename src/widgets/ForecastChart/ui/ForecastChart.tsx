import { motion } from "motion/react";
import { memo, useId, useMemo } from "react";
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceArea,
	ReferenceDot,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { DailyActual } from "@/entities/AccountHistory";
import type { Forecast } from "@/entities/Forecast";
import { fadeUp } from "@/shared/config/motion";
import { cssVar } from "@/shared/config/tokens";
import { cn } from "@/shared/lib/cn/cn";
import { formatDayShort, formatWeekday } from "@/shared/lib/date/date";
import { formatCompact, formatMoney, toNumber } from "@/shared/lib/format/money";
import { buildSeries } from "../lib/buildSeries";
import type { ChartRow } from "../lib/buildSeries";

interface ForecastChartProps {
	forecast: Forecast | null;
	history?: DailyActual[];
	scenario?: { date: string; scenario: number }[] | null;
	height?: number;
	className?: string;
	/** Клик по периоду разрыва → объяснение */
	onGapClick?: (gapId: string) => void;
}

const axis = { stroke: cssVar("muted-foreground"), fontSize: 12, tickLine: false, axisLine: false } as const;
const anim = { animationDuration: 900, animationEasing: "ease-out" } as const;

const TooltipBody = ({
	active,
	payload,
	label,
	asOf,
}: {
	active?: boolean;
	payload?: { payload: ChartRow }[];
	label?: string;
	asOf?: string;
}) => {
	if (!active || !payload?.length || !label) return null;
	const r = payload[0].payload;
	const isFuture = asOf ? label > asOf : false;
	return (
		<div className="min-w-48 rounded-md border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-pop">
			<div className="mb-1.5 font-medium first-letter:uppercase">
				{formatWeekday(label)}
				{isFuture && <span className="text-muted-foreground"> · прогноз</span>}
			</div>
			{r.actual !== undefined && (
				<Row
					color={cssVar("chart-actual")}
					label="Факт"
					value={r.actual === null ? "нет данных" : formatMoney(r.actual)}
				/>
			)}
			{r.forecast !== undefined && r.forecast !== null && (
				<Row
					color={cssVar("chart-forecast")}
					label="Прогноз"
					value={formatMoney(r.forecast)}
				/>
			)}
			{r.band && r.band[0] !== r.band[1] && (
				<Row
					color={cssVar("chart-band")}
					label="Диапазон 80%"
					value={`${formatCompact(r.band[0])} … ${formatCompact(r.band[1])}`}
				/>
			)}
			{r.scenario !== undefined && r.scenario !== null && (
				<Row
					color={cssVar("danger")}
					label="Сценарий"
					value={formatMoney(r.scenario)}
				/>
			)}
		</div>
	);
};

const Row = ({ color, label, value }: { color: string; label: string; value: string }) => (
	<div className="flex items-center justify-between gap-4 py-0.5">
		<span className="flex items-center gap-1.5 text-muted-foreground">
			<span
				className="size-2 rounded-full"
				style={{ background: color }}
			/>
			{label}
		</span>
		<span className="font-medium tabular-nums">{value}</span>
	</div>
);

/** Кольцо на точке разрыва — как лаймовое кольцо на обложке кейса */
const GapRing = (props: { cx?: number; cy?: number }) => {
	const { cx = 0, cy = 0 } = props;
	return (
		<g>
			<motion.circle
				cx={cx}
				cy={cy}
				r={16}
				fill={cssVar("lime")}
				initial={{ opacity: 0.5, scale: 0.6 }}
				animate={{ opacity: [0.45, 0, 0.45], scale: [0.8, 1.6, 0.8] }}
				transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
				style={{ transformOrigin: "center", transformBox: "fill-box" }}
			/>
			<circle
				cx={cx}
				cy={cy}
				r={9}
				fill={cssVar("hero")}
				stroke={cssVar("lime")}
				strokeWidth={5}
			/>
		</g>
	);
};

export const ForecastChart = memo(
	({ forecast, history, scenario, height = 340, className, onGapClick }: ForecastChartProps) => {
		const id = useId().replace(/:/g, "");
		const data = useMemo(() => buildSeries(history, forecast, scenario), [history, forecast, scenario]);
		const buffer = toNumber(forecast?.settings?.bufferAmount) ?? 0;
		const firstGap = forecast?.gaps?.[0];
		const firstGapPoint = useMemo(() => {
			if (!forecast?.firstExpectedGapDate) return null;
			const day = forecast.days.find((d) => d.date === forecast.firstExpectedGapDate);
			const v = toNumber(day?.balance);
			return day && v !== null ? { date: day.date, value: v } : null;
		}, [forecast]);

		return (
			<motion.div
				variants={fadeUp}
				initial="hidden"
				animate="show"
				className={cn("w-full min-w-0", className)}
				style={{ height }}
			>
				<ResponsiveContainer>
					<ComposedChart
						data={data}
						margin={{ top: 16, right: 12, bottom: 0, left: 4 }}
					>
						<defs>
							<linearGradient
								id={`fc-${id}`}
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									stopColor={cssVar("chart-forecast")}
									stopOpacity={0.28}
								/>
								<stop
									offset="100%"
									stopColor={cssVar("chart-forecast")}
									stopOpacity={0}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid
							stroke={cssVar("chart-grid")}
							vertical={false}
						/>
						<XAxis
							dataKey="date"
							{...axis}
							tickFormatter={(d: string) => formatDayShort(d)}
							minTickGap={28}
						/>
						<YAxis
							{...axis}
							width={64}
							tickFormatter={(v: number) => formatCompact(v)}
						/>
						<Tooltip
							content={<TooltipBody asOf={forecast?.asOfDate} />}
							cursor={{ stroke: cssVar("border-strong"), strokeDasharray: "4 4" }}
						/>

						{forecast?.gaps?.map((g) => (
							<ReferenceArea
								key={g.id}
								x1={g.fromDate}
								x2={g.toDate === g.fromDate ? undefined : g.toDate}
								fill={cssVar(g.kind === "CASH_GAP" ? "danger" : "warning")}
								fillOpacity={0.1}
								stroke="none"
								ifOverflow="extendDomain"
								onClick={() => onGapClick?.(g.id)}
								style={{ cursor: onGapClick ? "pointer" : undefined }}
							/>
						))}

						<ReferenceLine
							y={0}
							stroke={cssVar("danger")}
							strokeOpacity={0.7}
						/>
						{buffer > 0 && (
							<ReferenceLine
								y={buffer}
								stroke={cssVar("chart-buffer")}
								strokeDasharray="6 4"
								label={{
									value: "буфер",
									position: "insideTopLeft",
									fill: cssVar("chart-buffer"),
									fontSize: 11,
								}}
							/>
						)}
						{forecast && (
							<ReferenceLine
								x={forecast.asOfDate}
								stroke={cssVar("border-strong")}
								strokeDasharray="3 3"
								label={{
									value: "срез",
									position: "insideTopRight",
									fill: cssVar("muted-foreground"),
									fontSize: 11,
								}}
							/>
						)}

						<Area
							type="monotone"
							dataKey="band"
							stroke="none"
							fill={cssVar("chart-band")}
							connectNulls={false}
							isAnimationActive
							{...anim}
						/>
						<Area
							type="monotone"
							dataKey="forecast"
							stroke={cssVar("chart-forecast")}
							strokeWidth={2.5}
							fill={`url(#fc-${id})`}
							dot={false}
							activeDot={{ r: 5, strokeWidth: 0 }}
							connectNulls
							{...anim}
						/>
						<Line
							type="monotone"
							dataKey="actual"
							stroke={cssVar("chart-actual")}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
							connectNulls={false}
							{...anim}
						/>
						{scenario && scenario.length > 0 && (
							<Line
								type="monotone"
								dataKey="scenario"
								stroke={cssVar("danger")}
								strokeWidth={2.5}
								strokeDasharray="7 5"
								dot={false}
								activeDot={{ r: 5 }}
								{...anim}
							/>
						)}
						{firstGapPoint && (
							<ReferenceDot
								x={firstGapPoint.date}
								y={firstGapPoint.value}
								shape={<GapRing />}
								onClick={() => firstGap && onGapClick?.(firstGap.id)}
							/>
						)}
					</ComposedChart>
				</ResponsiveContainer>
			</motion.div>
		);
	}
);

export const ForecastChartLegend = memo(({ withScenario }: { withScenario?: boolean }) => (
	<div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
		<span className="flex items-center gap-1.5">
			<span className="h-0.5 w-4 rounded-full bg-chart-actual" />
			Факт
		</span>
		<span className="flex items-center gap-1.5">
			<span className="h-1 w-4 rounded-full bg-chart-forecast" />
			Прогноз
		</span>
		<span className="flex items-center gap-1.5">
			<span className="h-2.5 w-4 rounded-2xs bg-chart-band" />
			80% сценариев
		</span>
		<span className="flex items-center gap-1.5">
			<span className="size-3 rounded-full border-2 border-lime bg-hero" />
			Первый разрыв
		</span>
		{withScenario && (
			<span className="flex items-center gap-1.5">
				<span className="w-4 border-t-2 border-dashed border-danger" />
				Сценарий «что если»
			</span>
		)}
	</div>
));
