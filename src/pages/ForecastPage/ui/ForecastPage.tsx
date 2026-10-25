import { CalendarClock, FileUp, FlaskConical, Info, ListTree, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGetDailyHistoryQuery } from "@/entities/AccountHistory";
import { dataAsOfDate, useGetAccountQuery } from "@/entities/Company";
import { QUALITY_LABEL, SCOPE_LABEL, useGetDashboardQuery } from "@/entities/Forecast";
import { useWorkspace } from "@/entities/Workspace";
import { DownloadButton } from "@/features/DownloadResult";
import { PlanFormDialog } from "@/features/EditExpectedPayment";
import { RunForecastButton } from "@/features/RunForecast";
import { WhatIfPanel } from "@/features/WhatIfScenario";
import type { ScenarioResult } from "@/features/WhatIfScenario";
import { fadeUp, motionTokens, spring, stagger, tween } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { addDays, formatDayFull, formatInstant } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { formatRatio } from "@/shared/lib/format/percent";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Spinner } from "@/shared/ui/Spinner/Spinner";
import { Status } from "@/shared/ui/Status/Status";
import { AlertsPanel } from "@/widgets/AlertsPanel";
import { ForecastChart, ForecastChartLegend } from "@/widgets/ForecastChart";
import { ForecastOverview } from "@/widgets/ForecastOverview";
import { RecurringPanel } from "@/widgets/RecurringPanel";
import { TraceTimeline } from "@/widgets/TraceTimeline";
import { UpcomingPayments } from "@/widgets/UpcomingPayments";

type Mode = "forecast" | "whatif";

const Banner = ({
	tone,
	icon,
	children,
	action,
}: {
	tone: "warning" | "info" | "neutral";
	icon: React.ReactNode;
	children: React.ReactNode;
	action?: React.ReactNode;
}) => (
	<motion.div
		layout
		variants={fadeUp}
		initial="hidden"
		animate="show"
		exit={{ opacity: 0, height: 0, transition: tween.exit }}
		className={
			tone === "warning"
				? "flex flex-wrap items-center gap-3 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground"
				: tone === "info"
					? "flex flex-wrap items-center gap-3 rounded-lg bg-info-soft px-4 py-3 text-sm text-info-soft-foreground"
					: "flex flex-wrap items-center gap-3 rounded-lg bg-card px-4 py-3 text-sm text-foreground shadow-card"
		}
	>
		<span className="flex shrink-0 [&_svg]:size-5">{icon}</span>
		<span className="min-w-0 flex-1 text-pretty">{children}</span>
		{action}
	</motion.div>
);

const ForecastPage = () => {
	const { companyId, accountId } = useWorkspace();
	const [polling, setPolling] = useState(false);
	const dashboard = useGetDashboardQuery(
		{ companyId, accountId },
		{ pollingInterval: polling ? motionTokens.poll.dashboardMs : 0 }
	);
	const account = useGetAccountQuery({ companyId, accountId });
	const d = dashboard.data;
	const running = (d?.runningJobs ?? []).filter((j) => j.type === "FORECAST");

	// Пока бэк сам пересчитывает (AUTO) — опрашиваем dashboard, потом останавливаемся
	const hasRunning = running.length > 0;
	useEffect(() => {
		setPolling(hasRunning);
	}, [hasRunning]);

	// Срез для расчёта — конец данных счёта: выписки бывают историческими, а «вчера» по ним пусто
	const runAsOf = dataAsOfDate(account.data, d?.asOfDate);
	const chartAsOf = d?.latestForecast?.asOfDate ?? runAsOf;
	const history = useGetDailyHistoryQuery(
		{ companyId, accountId, from: addDays(chartAsOf, -41), to: chartAsOf },
		{ skip: !d || !account.data }
	);

	const [mode, setMode] = useState<Mode>("forecast");
	const [scenario, setScenario] = useState<ScenarioResult | null>(null);
	const onScenario = useCallback((r: ScenarioResult | null) => setScenario(r), []);
	const [planOpen, setPlanOpen] = useState(false);
	const [traceOpen, setTraceOpen] = useState(false);
	const [planPreset, setPlanPreset] = useState<{ amount: string; dueDate: string } | null>(null);

	const preset = useMemo(
		() =>
			planPreset
				? {
						title: "Внеплановый расход",
						direction: "OUT" as const,
						amount: planPreset.amount,
						dueDate: planPreset.dueDate,
					}
				: undefined,
		[planPreset]
	);

	const scenarioSeries = useMemo(
		() =>
			mode === "whatif" && scenario ? scenario.points.map((p) => ({ date: p.date, scenario: p.scenario })) : null,
		[mode, scenario]
	);

	if (dashboard.isLoading || account.isLoading) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-16 w-2/3" />
				<div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton
							key={i}
							className="h-32 rounded-xl"
						/>
					))}
				</div>
				<Skeleton className="h-96 rounded-xl" />
			</div>
		);
	}

	if (dashboard.error || !d) {
		return (
			<Card className="mx-auto max-w-xl">
				<ErrorState
					error={dashboard.error}
					onRetry={dashboard.refetch}
					title="Не удалось открыть прогноз"
				/>
				<div className="flex justify-center pb-8">
					<Link to={RoutePath.onboarding}>
						<Button variant="quiet">Выбрать другой счёт</Button>
					</Link>
				</div>
			</Card>
		);
	}

	const f = d.latestForecast;
	const canWrite = d.permissions.canWrite;
	// «Нет данных» — только если у счёта нет ни остатка, ни прогноза (а не пустое окно у «вчера»)
	const noData = !d.currentBalance && !f && account.data?.latestBalance === null;
	const historical = runAsOf < d.asOfDate;
	const stale = f?.staleness === "STALE" || d.refresh.needsRefresh;

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker={account.data ? `${account.data.name} · ${account.data.bankName ?? "счёт"}` : "Прогноз"}
				title="Деньги на ближайший месяц"
				sub={
					f
						? `Срез на ${formatDayFull(f.asOfDate)} · ${SCOPE_LABEL[f.scope]} · рассчитан ${formatInstant(f.createdAt)}`
						: "Прогноз остатка по дням и риск кассового разрыва"
				}
				actions={
					!noData ? (
						<div className="flex flex-wrap items-center gap-2">
							{f && (
								<>
									<Button
										size="sm"
										variant="outline"
										onClick={() => setTraceOpen(true)}
									>
										<ListTree />
										Лог расчёта
									</Button>
									<DownloadButton
										companyId={companyId}
										accountId={accountId}
										resultId={f.id}
										file="forecast-csv"
									/>
								</>
							)}
							{canWrite && (
								<RunForecastButton
									companyId={companyId}
									accountId={accountId}
									asOfDate={runAsOf}
									externalBusy={running.length > 0}
									label={f ? "Пересчитать" : "Рассчитать прогноз"}
								/>
							)}
						</div>
					) : undefined
				}
			/>

			<AnimatePresence initial={false}>
				{historical && !noData && (
					<Banner
						key="historical"
						tone="neutral"
						icon={<CalendarClock />}
					>
						Последние данные по счёту — {formatDayFull(runAsOf)}, прогноз строится от этой даты. Загрузите
						свежую выписку, чтобы срез был сегодняшним.
					</Banner>
				)}
				{running.length > 0 && (
					<Banner
						key="running"
						tone="info"
						icon={<Spinner className="size-5" />}
					>
						Пересчитываем прогноз с новыми данными
						{running[0].origin === "AUTO" ? " автоматически" : ""}… Старый результат остаётся на экране.
					</Banner>
				)}
				{stale && running.length === 0 && f && (
					<Banner
						key="stale"
						tone="warning"
						icon={<RefreshCw />}
					>
						Данные изменились после расчёта — прогноз мог устареть.
						{d.refresh.autoRefreshEnabled ? " Автопересчёт скоро начнётся, или пересчитайте сейчас." : ""}
					</Banner>
				)}
			</AnimatePresence>

			{noData ? (
				<Card>
					<EmptyState
						icon={<FileUp />}
						title="Начнём с выписки"
						text="Загрузите банковскую выписку в CSV за 1,5–2 года — мы разберём операции по категориям, найдём регулярные платежи и построим прогноз."
						action={
							<Link to={RoutePath.import}>
								<Button variant="brand">
									<FileUp />
									Загрузить выписку
								</Button>
							</Link>
						}
					/>
				</Card>
			) : (
				<>
					<ForecastOverview
						dashboard={d}
						account={account.data}
					/>

					<motion.div
						variants={stagger(0.06, 0.1)}
						initial="hidden"
						animate="show"
						className="grid grid-cols-1 gap-4 lg:grid-cols-3"
					>
						<motion.div
							variants={fadeUp}
							className="min-w-0 lg:col-span-2"
						>
							<Card className="flex h-full flex-col">
								<CardHeader className="flex-wrap">
									<CardTitle>Остаток по дням</CardTitle>
									{f && (
										<Segmented
											size="sm"
											value={mode}
											onChange={setMode}
											label="Режим"
											options={[
												{ value: "forecast", label: "Прогноз", icon: <TrendingUp /> },
												{ value: "whatif", label: "Что если", icon: <Sparkles /> },
											]}
										/>
									)}
								</CardHeader>
								<div className="flex flex-1 flex-col gap-3 px-2 pt-2 pb-4 sm:px-4">
									{f ? (
										<>
											<ForecastChart
												forecast={f}
												history={history.data?.items}
												scenario={scenarioSeries}
											/>
											<div className="px-2">
												<ForecastChartLegend withScenario={Boolean(scenarioSeries)} />
											</div>
										</>
									) : (
										<EmptyState
											icon={<TrendingUp />}
											title="Прогноз ещё не рассчитан"
											text="Нажмите «Рассчитать прогноз» — расчёт займёт несколько секунд."
										/>
									)}
								</div>
							</Card>
						</motion.div>

						<motion.div
							variants={fadeUp}
							className="min-w-0"
						>
							<Card className="h-full">
								<AnimatePresence
									mode="wait"
									initial={false}
								>
									{mode === "whatif" && f ? (
										<motion.div
											key="whatif"
											initial={{ opacity: 0, x: 16 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -16, transition: tween.exit }}
											transition={{ ...spring.soft, opacity: tween.base }}
										>
											<CardHeader>
												<CardTitle>Что если…</CardTitle>
											</CardHeader>
											<div className="p-4 sm:p-6">
												<WhatIfPanel
													companyId={companyId}
													accountId={accountId}
													forecast={f}
													onResult={onScenario}
													canSave={canWrite}
													onSaveExpense={(amount, date) => {
														setPlanPreset({ amount, dueDate: date });
														setPlanOpen(true);
													}}
												/>
											</div>
										</motion.div>
									) : (
										<motion.div
											key="meta"
											initial={{ opacity: 0, x: -16 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: 16, transition: tween.exit }}
											transition={{ ...spring.soft, opacity: tween.base }}
										>
											<CardHeader>
												<CardTitle>Насколько можно доверять</CardTitle>
											</CardHeader>
											<div className="flex flex-col gap-4 p-4 sm:p-6">
												<div className="flex items-center justify-between gap-2">
													<span className="text-sm text-muted-foreground">История</span>
													<Status tone={QUALITY_LABEL[d.quality].tone}>
														{QUALITY_LABEL[d.quality].label}
													</Status>
												</div>
												<p className="text-xs text-muted-foreground">
													{QUALITY_LABEL[d.quality].hint}
												</p>
												{d.latestBacktest ? (
													<div className="flex flex-col gap-2 rounded-md bg-muted p-3">
														<div className="text-xs font-semibold">Проверка на истории</div>
														<div className="flex items-baseline justify-between text-sm">
															<span className="text-muted-foreground">
																Средняя ошибка остатка
															</span>
															<span className="font-display font-semibold tabular-nums">
																{d.latestBacktest.maeBalance
																	? formatMoney(d.latestBacktest.maeBalance)
																	: "мало наблюдений"}
															</span>
														</div>
														{d.latestBacktest.gapMetrics && (
															<div className="flex items-baseline justify-between text-sm">
																<span className="text-muted-foreground">
																	Находит разрывы
																</span>
																<span className="font-display font-semibold tabular-nums">
																	{d.latestBacktest.gapMetrics.recall === null
																		? "мало наблюдений"
																		: formatRatio(
																				d.latestBacktest.gapMetrics.recall
																			)}
																</span>
															</div>
														)}
														<Link
															to={RoutePath.quality}
															className="text-xs font-medium text-accent-foreground"
														>
															Подробнее о точности →
														</Link>
													</div>
												) : (
													<div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs">
														<FlaskConical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
														<span>
															Качество ещё не проверено.{" "}
															<Link
																to={RoutePath.quality}
																className="font-medium text-accent-foreground"
															>
																Запустить проверку
															</Link>
														</span>
													</div>
												)}
												{f && f.warnings.length > 0 && (
													<ul className="flex flex-col gap-1.5">
														{f.warnings.map((w, i) => (
															<li
																key={w.code + i}
																className="flex gap-2 text-xs text-muted-foreground"
															>
																<Info className="mt-0.5 size-3.5 shrink-0" />
																{w.message}
															</li>
														))}
													</ul>
												)}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</Card>
						</motion.div>
					</motion.div>

					<motion.div
						variants={stagger(0.06, 0.2)}
						initial="hidden"
						animate="show"
						className="grid grid-cols-1 gap-4 lg:grid-cols-2"
					>
						<motion.div
							variants={fadeUp}
							className="min-w-0"
						>
							<AlertsPanel
								companyId={companyId}
								accountId={accountId}
								alerts={d.activeAlerts}
								canWrite={canWrite}
								className="h-full"
							/>
						</motion.div>
						<motion.div
							variants={fadeUp}
							className="min-w-0"
						>
							<UpcomingPayments
								items={d.upcomingPayments}
								asOfDate={d.asOfDate}
								className="h-full"
								onAdd={
									canWrite
										? () => {
												setPlanPreset(null);
												setPlanOpen(true);
											}
										: undefined
								}
							/>
						</motion.div>
					</motion.div>

					<motion.div
						variants={fadeUp}
						initial="hidden"
						animate="show"
					>
						<RecurringPanel
							companyId={companyId}
							accountId={accountId}
						/>
					</motion.div>
				</>
			)}

			<Dialog
				open={traceOpen}
				onClose={() => setTraceOpen(false)}
				title="Лог расчёта"
				description="Как получен прогноз: проверка входа, окно обучения, регулярные платежи, планы, каждый день и риск"
				className="sm:max-w-3xl"
			>
				<TraceTimeline trace={f?.trace} />
			</Dialog>

			<PlanFormDialog
				open={planOpen}
				onClose={() => setPlanOpen(false)}
				companyId={companyId}
				accountId={accountId}
				preset={preset}
			/>
		</div>
	);
};

export default ForecastPage;
