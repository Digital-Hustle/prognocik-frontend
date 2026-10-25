import { Info, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { memo, useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useListBacktestOriginsQuery } from "@/entities/Backtest";
import type { Backtest } from "@/entities/Backtest";
import { SCOPE_LABEL } from "@/entities/Forecast";
import { stagger } from "@/shared/config/motion";
import { cssVar } from "@/shared/config/tokens";
import { formatDay, formatDayShort, formatInstant } from "@/shared/lib/date/date";
import { formatCompact, formatMoney, toNumber } from "@/shared/lib/format/money";
import { formatRatio } from "@/shared/lib/format/percent";
import { plural } from "@/shared/lib/format/plural";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { Status } from "@/shared/ui/Status/Status";
import { ratioText } from "../lib";
import { ConfusionMatrixCard } from "./ConfusionMatrixCard";
import { ForecastVsActual } from "./ForecastVsActual";
import { ModelMetricsTable } from "./ModelMetricsTable";
import { ModelSelectionCard } from "./ModelSelectionCard";

interface BacktestReportProps {
	companyId: string;
	accountId: string;
	backtest: Backtest;
}

const axis = { stroke: cssVar("muted-foreground"), fontSize: 12, tickLine: false, axisLine: false } as const;
const few = "мало наблюдений";
const days = (v: number | null) =>
	v === null ? few : `${v.toFixed(1)} ${plural(Math.round(v), "день", "дня", "дней")}`;

/**
 * Качество модели и вероятность разрыва — разные карточки. MAE/RMSE в рублях; null — «недостаточно наблюдений»,
 * не 0 и не 100%. Единого «процента валидации» не выводим (CLIENT_HANDOFF).
 */
export const BacktestReport = memo(({ companyId, accountId, backtest: b }: BacktestReportProps) => {
	const origins = useListBacktestOriginsQuery({ companyId, accountId, backtestId: b.id });
	const horizons = useMemo(
		() =>
			b.horizons.map((h) => ({
				day: h.horizonDay,
				mae: toNumber(h.maeBalance),
				rmse: toNumber(h.rmseBalance),
				n: h.evaluatedCount,
			})),
		[b.horizons]
	);
	const bins = useMemo(
		() =>
			(b.riskMetrics?.calibrationBins ?? []).map((c) => ({
				label: `${Math.round(c.fromProbability * 100)}–${Math.round(c.toProbability * 100)}%`,
				predicted: c.meanProbability,
				observed: c.observedRate,
				count: c.count,
			})),
		[b.riskMetrics]
	);
	const gm = b.gapMetrics;
	const originItems = origins.data?.items ?? b.origins ?? [];
	const q = b.quality ?? null;
	const overlapping = b.warnings.some((w) => w.code === "OVERLAPPING_ORIGINS");
	const otherWarnings = b.warnings.filter((w) => w.code !== "OVERLAPPING_ORIGINS");

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<Status tone={b.staleness === "CURRENT" ? "success" : "warning"}>
					{b.staleness === "CURRENT" ? "Актуально" : "Данные изменились после проверки"}
				</Status>
				<span className="text-muted-foreground">
					Отсечки {formatDay(b.firstOrigin)} — {formatDay(b.lastOrigin)}, шаг {b.stepDays} дн. · окно{" "}
					{b.windowWeeks} нед. · {SCOPE_LABEL[b.scope]} · {b.algorithmVersion} · {formatInstant(b.createdAt)}
				</span>
			</div>

			<motion.dl
				variants={stagger(0.05)}
				initial="hidden"
				animate="show"
				className="grid grid-cols-2 gap-3 lg:grid-cols-4"
			>
				<Stat
					tone="hero"
					label="Средняя ошибка остатка (MAE)"
					value={b.maeBalance ? formatMoney(b.maeBalance) : few}
					sub={`по ${b.evaluatedDays} ${plural(b.evaluatedDays, "дню", "дням", "дням")}`}
				/>
				<Stat
					label="RMSE"
					value={b.rmseBalance ? formatMoney(b.rmseBalance) : few}
					sub="чувствительна к крупным промахам"
				/>
				<Stat
					label="Отсечек проверено"
					value={b.evaluatedOrigins}
					sub={b.skippedOrigins ? `пропущено ${b.skippedOrigins}` : "без пропусков"}
				/>
				<Stat
					tone={gm && gm.recall !== null && gm.recall >= 0.7 ? "lime" : "plain"}
					label="Находит разрывы (recall)"
					value={gm?.recall === null || !gm ? few : formatRatio(gm.recall)}
					sub={gm?.precision === null || !gm ? undefined : `точность ${formatRatio(gm.precision)}`}
				/>
			</motion.dl>

			{!q && (
				<Notice icon={<Info />}>
					Пересчитайте проверку, чтобы увидеть метрики: у этого результата нет таблиц ошибок и матриц — он
					посчитан до обновления сервиса.
				</Notice>
			)}
			{overlapping && (
				<Notice icon={<TriangleAlert />}>
					Отсечки пересекаются (шаг меньше горизонта), поэтому дневные наблюдения соседних отсечек не
					независимы. Метрики верны, но доверительные оценки лучше читать осторожно.
				</Notice>
			)}
			{otherWarnings.map((w, i) => (
				<Notice
					key={w.code + i}
					icon={<Info />}
				>
					{w.date ? `${formatDay(w.date)}: ` : ""}
					{w.message}
				</Notice>
			))}

			{q && (
				<>
					<ModelMetricsTable quality={q} />
					<div className="grid gap-4 xl:grid-cols-2">
						<ConfusionMatrixCard
							title="Разрыв по дням"
							subtitle="Для каждого проверенного дня: был ли остаток ниже порога по прогнозу и по факту"
							matrix={q.primary.dailyMatrix}
						/>
						<ConfusionMatrixCard
							title="Разрыв в ближайшие 30 дней"
							subtitle="Для каждой отсечки: предсказали ли разрыв в горизонте и случился ли он"
							matrix={q.originMatrix}
						/>
						<ConfusionMatrixCard
							title="По вероятности сценариев"
							subtitle={`Разрыв предсказан, если вероятность ниже нуля ≥ ${Math.round(q.scenarioThreshold * 100)}%`}
							matrix={q.scenarioDailyMatrix}
						/>
						<ConfusionMatrixCard
							title="Ниже страхового буфера"
							subtitle="Считается только когда в настройках задан буфер"
							matrix={q.bufferDailyMatrix}
							event="ниже буфера"
						/>
					</div>
					{q.selection && <ModelSelectionCard selection={q.selection} />}
					{q.notes.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Как читать эти цифры</CardTitle>
							</CardHeader>
							<ul className="flex flex-col gap-2 p-4 text-sm text-muted-foreground sm:p-6">
								{q.notes.map((n, i) => (
									<li
										key={i}
										className="flex gap-2"
									>
										<Info className="mt-0.5 size-4 shrink-0" />
										{n}
									</li>
								))}
							</ul>
						</Card>
					)}
				</>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Ошибка по горизонту</CardTitle>
					</CardHeader>
					<div className="px-2 pt-2 pb-4 sm:px-4">
						{horizons.length === 0 ? (
							<p className="p-4 text-sm text-muted-foreground">{few}</p>
						) : (
							<div style={{ height: 240 }}>
								<ResponsiveContainer>
									<LineChart
										data={horizons}
										margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
									>
										<CartesianGrid
											stroke={cssVar("chart-grid")}
											vertical={false}
										/>
										<XAxis
											dataKey="day"
											{...axis}
											tickFormatter={(d: number) => `${d} д`}
										/>
										<YAxis
											{...axis}
											width={56}
											tickFormatter={(v: number) => formatCompact(v)}
										/>
										<Tooltip
											formatter={(v, name) => [
												formatMoney(v as number),
												name === "mae" ? "MAE" : "RMSE",
											]}
											labelFormatter={(d) => `${d}-й день прогноза`}
											contentStyle={{
												background: cssVar("popover"),
												border: `1px solid ${cssVar("border")}`,
												borderRadius: 12,
												fontSize: 12,
											}}
										/>
										<Line
											type="monotone"
											dataKey="rmse"
											stroke={cssVar("chart-plan")}
											strokeDasharray="5 4"
											dot={false}
											animationDuration={900}
										/>
										<Line
											type="monotone"
											dataKey="mae"
											stroke={cssVar("chart-forecast")}
											strokeWidth={2.5}
											dot={{ r: 3 }}
											animationDuration={900}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}
						<p className="px-2 text-xs text-muted-foreground">
							Чем дальше от даты прогноза, тем больше ошибка — это нормально. Сплошная — MAE, пунктир —
							RMSE.
						</p>
					</div>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Кассовые разрывы на истории</CardTitle>
					</CardHeader>
					{gm ? (
						<div className="grid grid-cols-2 gap-3 p-4 sm:p-6">
							{[
								["Угадали разрыв", gm.truePositive],
								["Ложная тревога", gm.falsePositive],
								["Пропустили", gm.falseNegative],
								["Предупреждаем за", days(gm.medianLeadDays)],
								["Ошибка даты", days(gm.dateMaeDays)],
								["Ошибка суммы нехватки", gm.shortfallMae ? formatMoney(gm.shortfallMae) : few],
								["F1 по разрывам", ratioText(gm.f1 ?? null)],
							].map(([label, value]) => (
								<div
									key={String(label)}
									className="rounded-md bg-muted p-3"
								>
									<div className="text-xs text-muted-foreground">{label}</div>
									<div className="font-display text-lg font-semibold tabular-nums">{value}</div>
								</div>
							))}
						</div>
					) : (
						<p className="p-6 text-sm text-muted-foreground">
							Разрывов на проверенном периоде не было — оценивать нечего.
						</p>
					)}
				</Card>
			</div>

			{b.riskMetrics && (
				<Card>
					<CardHeader>
						<CardTitle>Калибровка вероятности</CardTitle>
						<span className="text-xs text-muted-foreground">
							Brier {b.riskMetrics.brierScore === null ? "—" : b.riskMetrics.brierScore.toFixed(3)} ·
							покрытие 80%-интервала {formatRatio(b.riskMetrics.interval80Coverage)} (идеал ≈ 80%)
						</span>
					</CardHeader>
					<div className="px-2 pt-2 pb-4 sm:px-4">
						{bins.length === 0 ? (
							<p className="p-4 text-sm text-muted-foreground">{few}</p>
						) : (
							<div style={{ height: 220 }}>
								<ResponsiveContainer>
									<BarChart
										data={bins}
										margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
									>
										<CartesianGrid
											stroke={cssVar("chart-grid")}
											vertical={false}
										/>
										<XAxis
											dataKey="label"
											{...axis}
										/>
										<YAxis
											{...axis}
											width={40}
											domain={[0, 1]}
											tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
										/>
										<Tooltip
											formatter={(v, name) => [
												v === null ? "—" : formatRatio(v as number),
												name === "predicted" ? "Предсказано" : "Случилось",
											]}
											contentStyle={{
												background: cssVar("popover"),
												border: `1px solid ${cssVar("border")}`,
												borderRadius: 12,
												fontSize: 12,
											}}
										/>
										<ReferenceLine
											y={0.5}
											stroke={cssVar("border-strong")}
											strokeDasharray="3 3"
										/>
										<Bar
											dataKey="predicted"
											fill={cssVar("chart-plan")}
											fillOpacity={0.4}
											radius={[6, 6, 0, 0]}
										/>
										<Bar
											dataKey="observed"
											fill={cssVar("chart-forecast")}
											radius={[6, 6, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						)}
						<p className="px-2 text-xs text-muted-foreground">
							Хорошо откалиброванная модель: в корзине «30–40%» разрыв случался примерно в трети случаев.
						</p>
					</div>
				</Card>
			)}

			<ForecastVsActual origins={originItems} />

			<Card>
				<CardHeader>
					<CardTitle>Отсечки</CardTitle>
				</CardHeader>
				{origins.isLoading ? (
					<Skeleton className="m-4 h-24" />
				) : (
					<div className="overflow-x-auto p-2 sm:p-3">
						<table className="w-full min-w-[480px] text-sm">
							<thead>
								<tr className="text-left text-xs text-muted-foreground">
									<th className="px-3 py-2 font-medium">Дата среза</th>
									<th className="px-3 py-2 font-medium">Статус</th>
									<th className="px-3 py-2 text-right font-medium">MAE</th>
									<th className="px-3 py-2 text-right font-medium">Дней</th>
								</tr>
							</thead>
							<tbody>
								{originItems.map((o) => (
									<tr
										key={o.asOfDate}
										className="border-t border-border hover:bg-muted"
									>
										<td className="px-3 py-2">{formatDayShort(o.asOfDate)}</td>
										<td className="px-3 py-2">
											<Status tone={o.status === "EVALUATED" ? "success" : "neutral"}>
												{o.status === "EVALUATED" ? "проверено" : "пропущено"}
											</Status>
											{o.reason && (
												<span className="ml-2 text-xs text-muted-foreground">{o.reason}</span>
											)}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{o.maeBalance ? formatMoney(o.maeBalance) : "—"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">{o.evaluatedDays}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
});

const Notice = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
	<div className="flex items-start gap-2.5 rounded-lg bg-info-soft px-4 py-3 text-sm text-info-soft-foreground [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
		{icon}
		<span>{children}</span>
	</div>
);
