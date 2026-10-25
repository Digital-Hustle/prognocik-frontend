import { CalendarCheck, DatabaseZap, FlaskConical, Info, ListTree } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useGetDailyHistoryQuery, useGetDataQualityQuery } from "@/entities/AccountHistory";
import { useGetBacktestQuery, useListBacktestsQuery } from "@/entities/Backtest";
import { dataAsOfDate, useGetAccountQuery, useGetCompanyQuery } from "@/entities/Company";
import { QUALITY_LABEL } from "@/entities/Forecast";
import { useGetForecastSettingsQuery } from "@/entities/ForecastSettings";
import { useWorkspace } from "@/entities/Workspace";
import { OpenAssistantButton } from "@/features/AskAssistant";
import { CompletenessForm } from "@/features/ConfirmCompleteness";
import { DownloadButton } from "@/features/DownloadResult";
import { RunBacktestForm } from "@/features/RunBacktest";
import { fadeUp, stagger } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, formatDay, formatInstant } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { Status } from "@/shared/ui/Status/Status";
import { BacktestReport } from "@/widgets/BacktestReport";
import { HistoryHeatmap } from "@/widgets/HistoryHeatmap";
import { TraceTimeline } from "@/widgets/TraceTimeline";

const QualityPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const perms = company.data?.permissions;
	const quality = useGetDataQualityQuery({ companyId, accountId });
	const account = useGetAccountQuery({ companyId, accountId });
	const to = dataAsOfDate(account.data);
	const history = useGetDailyHistoryQuery({ companyId, accountId, from: addDays(to, -26 * 7 + 1), to });
	const settings = useGetForecastSettingsQuery({ companyId, accountId });
	const backtests = useListBacktestsQuery({ companyId, accountId });
	const [selected, setSelected] = useState("");
	const [completeOpen, setCompleteOpen] = useState(false);
	const [traceOpen, setTraceOpen] = useState(false);

	useEffect(() => {
		const first = backtests.data?.items[0]?.id;
		if (first && !backtests.data?.items.some((b) => b.id === selected)) setSelected(first);
	}, [backtests.data, selected]);

	const fromList = backtests.data?.items.find((b) => b.id === selected);
	const full = useGetBacktestQuery({ companyId, accountId, backtestId: selected }, { skip: !selected });
	const backtest = full.data ?? fromList;

	const q = quality.data;

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker="Проверка качества"
				title="Насколько точен прогноз"
				sub="Прогноз проверяется временной кросс-валидацией: модель «возвращается» на прошлые даты, строит прогноз только по тому, что было известно тогда, и сравнивает с фактом."
				actions={
					<OpenAssistantButton
						size="md"
						question="Насколько можно доверять прогнозу и чего не хватает в данных?"
					>
						Спросить про качество
					</OpenAssistantButton>
				}
			/>

			<section className="flex flex-col gap-4">
				<h2 className="font-display text-xl font-semibold">История операций</h2>
				{quality.isLoading ? (
					<Skeleton className="h-32 rounded-xl" />
				) : quality.error || !q ? (
					<Card>
						<ErrorState
							error={quality.error}
							onRetry={quality.refetch}
						/>
					</Card>
				) : (
					<motion.dl
						variants={stagger(0.05)}
						initial="hidden"
						animate="show"
						className="grid grid-cols-2 gap-3 lg:grid-cols-4"
					>
						<Stat
							tone={q.quality === "GOOD" ? "hero" : q.quality === "INSUFFICIENT" ? "danger" : "plain"}
							icon={<DatabaseZap />}
							label="Оценка истории"
							value={QUALITY_LABEL[q.quality].label}
							sub={`${formatDay(q.fromDate)} — ${formatDay(q.toDate)}`}
						/>
						<Stat
							label="Полных дней"
							value={q.completeDayCount}
						/>
						<Stat
							tone={q.missingDayCount > 0 ? "lime" : "plain"}
							label="Дней без данных"
							value={q.missingDayCount}
							sub={q.missingDayCount > 0 ? "подтвердите, если выписка полная" : undefined}
						/>
						<Stat
							label="Расхождения остатка"
							value={q.balanceMismatchCount}
							sub={`пустых назначений: ${q.emptyPurposeCount}`}
						/>
					</motion.dl>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Полнота по дням, полгода</CardTitle>
						{perms?.canImport && (
							<Button
								size="sm"
								variant="quiet"
								onClick={() => setCompleteOpen(true)}
							>
								<CalendarCheck />
								Отметить период
							</Button>
						)}
					</CardHeader>
					<div className="p-4 sm:p-6">
						{history.isLoading ? (
							<Skeleton className="h-28" />
						) : (history.data?.items ?? []).length === 0 ? (
							<EmptyState
								title="Нет истории"
								text="Загрузите выписку — здесь появится карта полноты."
							/>
						) : (
							<HistoryHeatmap days={history.data!.items} />
						)}
						{q && q.warnings.length > 0 && (
							<ul className="mt-4 flex flex-col gap-1.5">
								{q.warnings.slice(0, 6).map((w, i) => (
									<li
										key={w.code + i}
										className="flex gap-2 text-xs text-muted-foreground"
									>
										<Info className="mt-0.5 size-3.5 shrink-0" />
										{w.date ? `${formatDay(w.date)}: ` : ""}
										{w.message}
									</li>
								))}
							</ul>
						)}
					</div>
				</Card>
			</section>

			<section className="flex flex-col gap-4">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<h2 className="font-display text-xl font-semibold">Проверка на истории</h2>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					<motion.div
						variants={fadeUp}
						initial="hidden"
						animate="show"
						className="min-w-0"
					>
						<Card className="p-4 sm:p-6">
							<div className="mb-4 flex items-center gap-2">
								<FlaskConical className="size-5 text-brand" />
								<span className="font-display font-semibold">Новая проверка</span>
							</div>
							{settings.data ? (
								<RunBacktestForm
									companyId={companyId}
									accountId={accountId}
									windowWeeks={settings.data.windowWeeks}
									horizonDays={settings.data.horizonDays}
									dataEnd={account.data ? to : undefined}
									disabled={!perms?.canRunBacktest}
									onFinished={setSelected}
								/>
							) : (
								<Skeleton className="h-64" />
							)}
						</Card>
					</motion.div>
					<div className="min-w-0 lg:col-span-2">
						{backtests.isLoading ? (
							<Skeleton className="h-80 rounded-xl" />
						) : backtests.error ? (
							<Card>
								<ErrorState
									error={backtests.error}
									onRetry={backtests.refetch}
								/>
							</Card>
						) : !backtest ? (
							<Card className="h-full">
								<EmptyState
									icon={<FlaskConical />}
									title="Качество ещё не проверено"
									text="Запустите проверку: увидите среднюю ошибку остатка в рублях, как часто сервис находит разрывы заранее и насколько честны вероятности."
								/>
							</Card>
						) : (
							<Card className="flex h-full flex-col">
								<CardHeader>
									<CardTitle>Проверки</CardTitle>
									{full.isFetching && <Status tone="info">загружаем</Status>}
								</CardHeader>
								<motion.ul
									variants={stagger(0.04)}
									initial="hidden"
									animate="show"
									className="flex flex-col gap-1 p-2 sm:p-3"
								>
									{backtests.data?.items.map((b) => (
										<motion.li
											key={b.id}
											variants={fadeUp}
										>
											<button
												type="button"
												onClick={() => setSelected(b.id)}
												className={cn(
													"flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted",
													b.id === selected && "bg-accent text-accent-foreground"
												)}
											>
												<FlaskConical className="size-4 shrink-0" />
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-medium">
														{formatDay(b.firstOrigin)} — {formatDay(b.lastOrigin)}
													</span>
													<span className="block text-xs text-muted-foreground">
														{formatInstant(b.createdAt)} · {b.evaluatedOrigins} отсечек
													</span>
												</span>
												<span className="font-display text-sm font-semibold whitespace-nowrap tabular-nums">
													{b.maeBalance ? `±${formatMoney(b.maeBalance)}` : "—"}
												</span>
											</button>
										</motion.li>
									))}
								</motion.ul>
							</Card>
						)}
					</div>
				</div>

				{backtest && (
					<div className="flex flex-wrap items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => setTraceOpen(true)}
						>
							<ListTree />
							Лог эксперимента
						</Button>
						<DownloadButton
							companyId={companyId}
							accountId={accountId}
							resultId={backtest.id}
							file="backtest-report"
						/>
						<DownloadButton
							companyId={companyId}
							accountId={accountId}
							resultId={backtest.id}
							file="backtest-trace"
						/>
						<DownloadButton
							companyId={companyId}
							accountId={accountId}
							resultId={backtest.id}
							file="backtest-csv"
						/>
					</div>
				)}

				{backtest && (
					<BacktestReport
						companyId={companyId}
						accountId={accountId}
						backtest={backtest}
					/>
				)}
			</section>

			<Dialog
				open={traceOpen}
				onClose={() => setTraceOpen(false)}
				title="Лог эксперимента"
				description="Как проходила проверка: каждая отсечка, метрики, матрицы, эталоны и выбор модели"
				className="sm:max-w-3xl"
			>
				<TraceTimeline trace={backtest?.trace} />
			</Dialog>

			<Dialog
				open={completeOpen}
				onClose={() => setCompleteOpen(false)}
				title="Полнота периода"
				description="Подтвердите, что в эти дни операций действительно не было — тогда они станут «пустыми», а не пропусками"
			>
				<CompletenessForm
					companyId={companyId}
					accountId={accountId}
					onDone={() => setCompleteOpen(false)}
				/>
			</Dialog>
		</div>
	);
};

export default QualityPage;
