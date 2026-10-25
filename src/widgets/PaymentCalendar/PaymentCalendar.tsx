import { AlertTriangle, CalendarDays, Repeat2 } from "lucide-react";
import { motion } from "motion/react";
import { memo, useState } from "react";
import { SourceBadge } from "@/entities/ExpectedPayment";
import { CALENDAR_WARNING_LABEL, useGetPaymentCalendarQuery } from "@/entities/PaymentCalendar";
import type { CalendarItem } from "@/entities/PaymentCalendar";
import { fadeUp, stagger } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, formatWeekday, todayIso } from "@/shared/lib/date/date";
import { formatMoney, toNumber } from "@/shared/lib/format/money";
import { Card } from "@/shared/ui/Card/Card";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { Status } from "@/shared/ui/Status/Status";

const SPANS = ["30", "60", "90"] as const;

const Row = memo(({ item, names }: { item: CalendarItem; names: (code: string) => string }) => {
	const recurring = item.kind === "RECURRING";
	const settled = toNumber(item.settledAmount) ?? 0;
	return (
		<li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="truncate text-sm font-medium">
						{recurring ? names(item.categoryCode) : item.title}
					</span>
					{recurring && (
						<Status tone="info">
							<Repeat2 />
							регулярный
						</Status>
					)}
					{item.overdue && <Status tone="danger">просрочен</Status>}
					<SourceBadge doc={item.sourceDocument} />
				</div>
				<div className="truncate text-xs text-muted-foreground">
					{names(item.categoryCode)}
					{item.counterpartyKey ? ` · ${item.counterpartyKey}` : ""}
					{recurring ? " · расчётная дата" : ""}
					{item.nominalDate && item.nominalDate !== item.dueDate ? ` · по графику ${item.nominalDate}` : ""}
				</div>
			</div>
			<div className="shrink-0 sm:text-right">
				<div className={cn("font-display text-sm font-semibold tabular-nums", item.overdue && "text-danger")}>
					−{formatMoney(item.remainingAmount)}
				</div>
				{settled > 0 && (
					<div className="text-xs text-muted-foreground">
						оплачено {formatMoney(item.settledAmount)} из {formatMoney(item.amount)}
					</div>
				)}
			</div>
		</li>
	);
});

/** Календарь обязательных платежей: все будущие обязательства по датам, включая расчётные даты регулярных платежей. */
export const PaymentCalendar = memo(
	({ companyId, accountId, names }: { companyId: string; accountId: string; names: (code: string) => string }) => {
		const [span, setSpan] = useState<(typeof SPANS)[number]>("30");
		const from = todayIso();
		const { data, isLoading, error, refetch } = useGetPaymentCalendarQuery({
			companyId,
			accountId,
			fromDate: from,
			toDate: addDays(from, Number(span) - 1),
		});
		const days = (data?.days ?? []).filter((d) => d.items.length > 0);
		const overdueBefore = toNumber(data?.overdueBeforeRangeAmount) ?? 0;

		return (
			<div className="flex flex-col gap-4">
				<Segmented
					value={span}
					onChange={setSpan}
					label="Горизонт календаря"
					options={SPANS.map((s) => ({ value: s, label: `${s} дней` }))}
				/>

				{isLoading ? (
					<Skeleton className="h-48 rounded-xl" />
				) : error ? (
					<Card>
						<ErrorState
							error={error}
							onRetry={refetch}
						/>
					</Card>
				) : (
					data && (
						<>
							<motion.dl
								variants={stagger(0.05)}
								initial="hidden"
								animate="show"
								className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3"
							>
								<Stat
									tone="hero"
									label="Предстоит заплатить"
									value={`−${formatMoney(data.totals.remainingAmount)}`}
									icon={<CalendarDays />}
								/>
								<Stat
									label="Уже оплачено"
									value={formatMoney(data.totals.settledAmount)}
									sub={`из ${formatMoney(data.totals.amount)}`}
								/>
								<Stat
									tone={toNumber(data.totals.overdueAmount) ? "danger" : "plain"}
									label="Просрочено в периоде"
									value={formatMoney(data.totals.overdueAmount)}
								/>
							</motion.dl>

							{data.warnings.length > 0 && (
								<ul className="flex flex-col gap-1.5">
									{data.warnings.map((w) => (
										<li
											key={w}
											className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground"
										>
											<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
											{CALENDAR_WARNING_LABEL[w]}
										</li>
									))}
								</ul>
							)}

							{overdueBefore > 0 && (
								<Card className="p-4 ring-1 ring-danger-border sm:p-5">
									<div className="flex items-baseline justify-between gap-3">
										<h3 className="font-display text-sm font-semibold">
											Просрочено до начала периода
										</h3>
										<span className="font-display text-sm font-semibold text-danger tabular-nums">
											−{formatMoney(overdueBefore)}
										</span>
									</div>
									<ul className="flex flex-col divide-y divide-border pt-3">
										{data.overdueBeforeRange.map((i) => (
											<Row
												key={i.id}
												item={i}
												names={names}
											/>
										))}
									</ul>
								</Card>
							)}

							{days.length === 0 ? (
								<Card>
									<EmptyState
										icon={<CalendarDays />}
										title="Платежей в этом периоде нет"
										text="Добавьте планы или подтвердите регулярные платежи — они появятся здесь по датам."
									/>
								</Card>
							) : (
								<motion.ul
									variants={stagger(0.04)}
									initial="hidden"
									animate="show"
									className="flex flex-col gap-3"
								>
									{days.map((d) => (
										<motion.li
											key={d.date}
											variants={fadeUp}
										>
											<Card className="p-4 sm:p-5">
												<div className="flex items-baseline justify-between gap-3 pb-3">
													<h3 className="font-display text-sm font-semibold">
														{formatWeekday(d.date)}
													</h3>
													<span className="text-xs text-muted-foreground tabular-nums">
														итого −{formatMoney(d.totals.remainingAmount)}
													</span>
												</div>
												<ul className="flex flex-col divide-y divide-border">
													{d.items.map((i) => (
														<Row
															key={i.id}
															item={i}
															names={names}
														/>
													))}
												</ul>
											</Card>
										</motion.li>
									))}
								</motion.ul>
							)}
						</>
					)
				)}
			</div>
		);
	}
);
