import { ArrowDownLeft, ArrowUpRight, CalendarDays, ChevronDown, Repeat2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useMemo, useState } from "react";
import { dataAsOfDate, useGetAccountQuery, useGetCompanyQuery } from "@/entities/Company";
import { useCategoryNames } from "@/entities/Payment";
import { describeSchedule, useListRecurringPatternsQuery } from "@/entities/Recurring";
import type { PatternStatus } from "@/entities/Recurring";
import { ConfirmAllDetectedButton, DecideRecurringButtons, DetectRecurringButton } from "@/features/DetectRecurring";
import { fadeUp, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { formatDayShort } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { plural } from "@/shared/lib/format/plural";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";
import type { Tone } from "@/shared/ui/Status/Status";

const STATUS: Record<PatternStatus, { label: string; tone: Tone }> = {
	DETECTED: { label: "Нужно решение", tone: "info" },
	CONFIRMED: { label: "В прогнозе", tone: "success" },
	EXCLUDED: { label: "Исключено", tone: "neutral" },
};

type Filter = "ALL" | PatternStatus;
const PREVIEW = 5;

/**
 * Регулярные платежи на экране прогноза: аренда, зарплата, подписки. Подтверждённые прогноз ставит на их даты.
 * Новые «найденные» идут первыми — по ним нужно решение.
 */
export const RecurringPanel = memo(({ companyId, accountId }: { companyId: string; accountId: string }) => {
	const company = useGetCompanyQuery(companyId);
	const account = useGetAccountQuery({ companyId, accountId });
	const canEdit = company.data?.permissions.canEditPayments ?? false;
	const names = useCategoryNames(companyId);
	const { data, isLoading, error, refetch } = useListRecurringPatternsQuery({ companyId, accountId });
	const [filter, setFilter] = useState<Filter>("ALL");
	const [all, setAll] = useState(false);

	const count = (s: PatternStatus) => data?.items.filter((p) => p.status === s).length ?? 0;
	const items = useMemo(() => {
		const order: Record<PatternStatus, number> = { DETECTED: 0, CONFIRMED: 1, EXCLUDED: 2 };
		return [...(data?.items ?? [])]
			.filter((p) => filter === "ALL" || p.status === filter)
			.sort((a, b) => order[a.status] - order[b.status] || Number(b.amount) - Number(a.amount));
	}, [data, filter]);
	const shown = all ? items : items.slice(0, PREVIEW);

	return (
		<Card>
			<CardHeader className="flex-wrap">
				<CardTitle className="flex items-center gap-2">
					<Repeat2 className="size-5 text-muted-foreground" />
					Регулярные платежи
				</CardTitle>
				<div className="flex flex-wrap items-center gap-2">
					{canEdit && count("DETECTED") > 0 && (
						<ConfirmAllDetectedButton
							companyId={companyId}
							accountId={accountId}
							count={count("DETECTED")}
						/>
					)}
					<DetectRecurringButton
						companyId={companyId}
						accountId={accountId}
						disabled={!canEdit || !account.data}
						asOfDate={dataAsOfDate(account.data)}
						label={data?.items.length ? "Искать заново" : "Найти регулярные платежи"}
					/>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{data && data.items.length > 0 && (
					<Segmented
						size="sm"
						value={filter}
						onChange={(f) => {
							setFilter(f);
							setAll(false);
						}}
						label="Фильтр"
						options={[
							{ value: "ALL", label: `Все · ${data.items.length}` },
							{ value: "DETECTED", label: `Новые · ${count("DETECTED")}` },
							{ value: "CONFIRMED", label: `В прогнозе · ${count("CONFIRMED")}` },
							{ value: "EXCLUDED", label: `Исключены · ${count("EXCLUDED")}` },
						]}
					/>
				)}

				{isLoading ? (
					<Skeleton className="h-32 rounded-lg" />
				) : error ? (
					<ErrorState
						error={error}
						onRetry={refetch}
					/>
				) : (data?.items ?? []).length === 0 ? (
					<EmptyState
						icon={<Repeat2 />}
						title="Регулярности ещё не искали"
						text="Запустите поиск — сервис найдёт повторяющиеся поступления и списания по истории операций."
					/>
				) : (
					<>
						<ul className="flex flex-col divide-y divide-border">
							<AnimatePresence initial={false}>
								{shown.map((p) => (
									<motion.li
										key={p.id}
										layout
										variants={fadeUp}
										initial="hidden"
										animate="show"
										exit={{ opacity: 0, height: 0, transition: tween.exit }}
										className={cn(
											"flex flex-col gap-2 py-3 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:gap-4",
											p.status === "EXCLUDED" && "opacity-70"
										)}
									>
										<div className="flex min-w-0 flex-1 items-center gap-3">
											<span
												className={cn(
													"flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5",
													p.direction === "IN"
														? "bg-success-soft text-success-soft-foreground"
														: "bg-danger-soft text-danger-soft-foreground"
												)}
											>
												{p.direction === "IN" ? <ArrowDownLeft /> : <ArrowUpRight />}
											</span>
											<div className="min-w-0 flex-1">
												<div className="truncate text-sm font-semibold">
													{p.counterpartyKey?.replace(/^(inn|name):/, "") ??
														names(p.categoryCode)}
												</div>
												<div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
													<span>{names(p.categoryCode)}</span>
													<span className="flex items-center gap-1">
														<CalendarDays className="size-3" />
														{describeSchedule(p.schedule)}
													</span>
													{p.observations > 0 && (
														<span>
															{p.observations}{" "}
															{plural(p.observations, "раз", "раза", "раз")} ·{" "}
															{formatDayShort(p.lastSeen)}
														</span>
													)}
												</div>
											</div>
											<div
												className={cn(
													"font-display text-sm font-semibold whitespace-nowrap tabular-nums",
													p.direction === "IN"
														? "text-success-soft-foreground"
														: "text-danger-soft-foreground"
												)}
											>
												{p.direction === "IN" ? "+" : "−"}
												{formatMoney(p.amount)}
											</div>
										</div>
										<div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
											<Status tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Status>
											{canEdit && (
												<DecideRecurringButtons
													companyId={companyId}
													accountId={accountId}
													pattern={p}
												/>
											)}
										</div>
									</motion.li>
								))}
							</AnimatePresence>
						</ul>
						{items.length > PREVIEW && (
							<Button
								variant="quiet"
								size="sm"
								className="self-start"
								onClick={() => setAll((v) => !v)}
							>
								<ChevronDown className={cn("transition-transform", all && "rotate-180")} />
								{all ? "Свернуть" : `Показать все (${items.length})`}
							</Button>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
});
