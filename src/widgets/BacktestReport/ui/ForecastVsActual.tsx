import { memo, useMemo, useState } from "react";
import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { BacktestOrigin } from "@/entities/Backtest";
import { cssVar } from "@/shared/config/tokens";
import { formatDay, formatDayShort } from "@/shared/lib/date/date";
import { formatCompact, formatMoney, toNumber } from "@/shared/lib/format/money";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Select } from "@/shared/ui/Select/Select";

const axis = { stroke: cssVar("muted-foreground"), fontSize: 12, tickLine: false, axisLine: false } as const;

/** Прогноз против факта по дням выбранной отсечки; серая зона — P10–P90, если риск считался. */
export const ForecastVsActual = memo(({ origins }: { origins: BacktestOrigin[] }) => {
	const withDays = useMemo(
		() => origins.filter((o) => o.status === "EVALUATED" && (o.days?.length ?? 0) > 0),
		[origins]
	);
	const [picked, setPicked] = useState("");
	const origin = withDays.find((o) => o.asOfDate === picked) ?? withDays[withDays.length - 1];

	const data = useMemo(
		() =>
			(origin?.days ?? []).map((d) => {
				const p10 = toNumber(d.balanceP10);
				const p90 = toNumber(d.balanceP90);
				return {
					date: d.date,
					forecast: toNumber(d.forecastBalance),
					actual: toNumber(d.actualBalance),
					band: p10 !== null && p90 !== null ? [p10, p90] : null,
					predictedBreach: d.predictedBreach,
					actualBreach: d.actualBreach,
				};
			}),
		[origin]
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Прогноз против факта</CardTitle>
				{withDays.length > 0 && origin && (
					<Select
						size="sm"
						className="w-44"
						aria-label="Дата среза"
						value={origin.asOfDate}
						onChange={setPicked}
						options={withDays.map((o) => ({ value: o.asOfDate, label: `Срез ${formatDay(o.asOfDate)}` }))}
					/>
				)}
			</CardHeader>
			<div className="px-2 pt-2 pb-4 sm:px-4">
				{!origin ? (
					<p className="p-4 text-sm text-muted-foreground">
						Пересчитайте проверку, чтобы увидеть сравнение по дням: у этого результата нет дневной
						детализации.
					</p>
				) : (
					<>
						<div style={{ height: 280 }}>
							<ResponsiveContainer>
								<ComposedChart
									data={data}
									margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
								>
									<CartesianGrid
										stroke={cssVar("chart-grid")}
										vertical={false}
									/>
									<XAxis
										dataKey="date"
										{...axis}
										tickFormatter={(d: string) => formatDayShort(d)}
										minTickGap={24}
									/>
									<YAxis
										{...axis}
										width={60}
										tickFormatter={(v: number) => formatCompact(v)}
									/>
									<Tooltip
										formatter={(v, name) => {
											if (name === "band" && Array.isArray(v))
												return [`${formatMoney(v[0])} … ${formatMoney(v[1])}`, "P10–P90"];
											return [formatMoney(v as number), name === "forecast" ? "Прогноз" : "Факт"];
										}}
										labelFormatter={(d) => formatDay(String(d))}
										contentStyle={{
											background: cssVar("popover"),
											border: `1px solid ${cssVar("border")}`,
											borderRadius: 12,
											fontSize: 12,
										}}
									/>
									<ReferenceLine
										y={0}
										stroke={cssVar("chart-out")}
										strokeDasharray="4 4"
									/>
									<Area
										dataKey="band"
										stroke="none"
										fill={cssVar("chart-band")}
										isAnimationActive={false}
										connectNulls={false}
									/>
									<Line
										dataKey="forecast"
										stroke={cssVar("chart-forecast")}
										strokeWidth={2.5}
										dot={false}
										animationDuration={900}
									/>
									<Line
										dataKey="actual"
										stroke={cssVar("chart-actual")}
										strokeWidth={2}
										dot={false}
										connectNulls={false}
										animationDuration={900}
									/>
								</ComposedChart>
							</ResponsiveContainer>
						</div>
						<p className="px-2 text-xs text-muted-foreground">
							Зелёная — прогноз, построенный только по тому, что было известно на дату среза; тёмная — что
							случилось на самом деле. Красный пунктир — ноль. Дни без факта на линии не соединяются.
						</p>
					</>
				)}
			</div>
		</Card>
	);
});
