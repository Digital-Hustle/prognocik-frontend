import { ArrowDownLeft, ArrowUpRight, CalendarClock, CalendarPlus, Link2, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useGetCompanyQuery } from "@/entities/Company";
import { PLAN_SOURCE_LABEL, PLAN_STATUS_LABEL, useListExpectedPaymentsQuery } from "@/entities/ExpectedPayment";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import { useCategoryNames } from "@/entities/Payment";
import { useWorkspace } from "@/entities/Workspace";
import { AllocationsDialog } from "@/features/AllocatePayment";
import { CancelPlanButton, PlanFormDialog } from "@/features/EditExpectedPayment";
import { fadeUp, stagger, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, formatDay, formatDayShort, formatRelativeDays, todayIso } from "@/shared/lib/date/date";
import { formatMoney, toNumber } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";
import type { DateRange } from "@/shared/ui/DatePicker/DatePicker";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Progress } from "@/shared/ui/Progress/Progress";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { Status } from "@/shared/ui/Status/Status";

type Show = "open" | "all";

const PlansPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const canEdit = company.data?.permissions.canManagePlans ?? false;
	const names = useCategoryNames(companyId);
	const [range, setRange] = useState<DateRange>({ from: addDays(todayIso(), -30), to: addDays(todayIso(), 60) });
	const [show, setShow] = useState<Show>("open");
	const { data, isLoading, error, refetch } = useListExpectedPaymentsQuery({
		companyId,
		accountId,
		from: range.from,
		to: range.to,
	});
	const [editing, setEditing] = useState<ExpectedPayment | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [allocFor, setAllocFor] = useState<ExpectedPayment | null>(null);
	const [allocOpen, setAllocOpen] = useState(false);

	const items = useMemo(
		() =>
			[...(data?.items ?? [])]
				.filter((p) => show === "all" || p.status === "OPEN" || p.status === "PARTIALLY_SETTLED")
				.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
		[data, show]
	);

	const totals = useMemo(() => {
		const open = (data?.items ?? []).filter((p) => p.status === "OPEN" || p.status === "PARTIALLY_SETTLED");
		const sum = (dir: "IN" | "OUT") =>
			open.filter((p) => p.direction === dir).reduce((s, p) => s + (toNumber(p.remainingAmount) ?? 0), 0);
		return { in: sum("IN"), out: sum("OUT"), overdue: open.filter((p) => p.overdue).length };
	}, [data]);

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker="Будущие обязательства"
				title="Планы: счета, налоги, обещания"
				sub="Всё, чего ещё нет в выписке: выставленные счета, налоги по календарю, «клиент обещал заплатить 20-го». Прогноз ставит их на конкретные даты."
				actions={
					canEdit ? (
						<Button
							variant="brand"
							onClick={() => {
								setEditing(null);
								setFormOpen(true);
							}}
						>
							<CalendarPlus />
							Новый план
						</Button>
					) : undefined
				}
			/>

			{data && (
				<motion.dl
					variants={stagger(0.05)}
					initial="hidden"
					animate="show"
					className="grid grid-cols-1 gap-3 sm:grid-cols-3"
				>
					<Stat
						label="Ожидаем поступлений"
						value={`+${formatMoney(totals.in)}`}
						icon={<ArrowDownLeft />}
					/>
					<Stat
						tone="hero"
						label="Предстоит заплатить"
						value={`−${formatMoney(totals.out)}`}
						icon={<ArrowUpRight />}
					/>
					<Stat
						tone={totals.overdue ? "danger" : "plain"}
						label="Просрочено"
						value={totals.overdue}
						icon={<CalendarClock />}
						sub={totals.overdue ? "уточните новую ожидаемую дату" : "всё в срок"}
					/>
				</motion.dl>
			)}

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="sm:w-64">
					<DateRangePicker
						value={range}
						onChange={setRange}
						presets={[
							{ label: "Ближайший месяц", range: { from: todayIso(), to: addDays(todayIso(), 30) } },
							{
								label: "−30 / +60 дней",
								range: { from: addDays(todayIso(), -30), to: addDays(todayIso(), 60) },
							},
							{ label: "Квартал вперёд", range: { from: todayIso(), to: addDays(todayIso(), 92) } },
						]}
					/>
				</div>
				<Segmented
					value={show}
					onChange={setShow}
					label="Показать"
					options={[
						{ value: "open", label: "Открытые" },
						{ value: "all", label: "Все" },
					]}
				/>
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton
							key={i}
							className="h-24 rounded-xl"
						/>
					))}
				</div>
			) : error ? (
				<Card>
					<ErrorState
						error={error}
						onRetry={refetch}
					/>
				</Card>
			) : items.length === 0 ? (
				<Card>
					<EmptyState
						icon={<CalendarClock />}
						title="Планов в этом периоде нет"
						text="Добавьте налог, аренду, зарплату или ожидаемую оплату — и прогноз станет точнее."
					/>
				</Card>
			) : (
				<motion.ul
					layout
					className="flex flex-col gap-2"
				>
					<AnimatePresence initial={false}>
						{items.map((p) => {
							const total = toNumber(p.amount) ?? 0;
							const settled = toNumber(p.settledAmount) ?? 0;
							const st = PLAN_STATUS_LABEL[p.status];
							const open = p.status === "OPEN" || p.status === "PARTIALLY_SETTLED";
							return (
								<motion.li
									key={p.id}
									layout
									variants={fadeUp}
									initial="hidden"
									animate="show"
									exit={{ opacity: 0, height: 0, transition: tween.exit }}
								>
									<Card
										className={cn(
											"flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5",
											p.overdue && "ring-1 ring-danger-border"
										)}
									>
										<div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
											<div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-muted py-1.5">
												<span className="font-display text-lg leading-tight font-semibold">
													{p.dueDate.slice(8)}
												</span>
												<span className="text-[11px] text-muted-foreground">
													{formatDayShort(p.dueDate).split(" ")[1]}
												</span>
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<span className="truncate font-semibold">{p.title}</span>
													<Status tone={p.overdue ? "danger" : st.tone}>
														{p.overdue ? "Просрочен" : st.label}
													</Status>
												</div>
												<div className="truncate text-xs text-muted-foreground">
													{names(p.categoryCode)} · {PLAN_SOURCE_LABEL[p.source]}
													{p.counterpartyKey ? ` · ${p.counterpartyKey}` : ""} ·{" "}
													{open ? formatRelativeDays(p.dueDate) : formatDay(p.dueDate)}
												</div>
												{p.note && (
													<div className="truncate text-xs text-subtle-foreground">
														{p.note}
													</div>
												)}
											</div>
										</div>
										<div className="flex w-full flex-col gap-1.5 sm:w-56">
											<div className="flex items-baseline justify-between gap-2">
												<span
													className={cn(
														"font-display font-semibold tabular-nums",
														p.direction === "IN" && "text-success-soft-foreground"
													)}
												>
													{p.direction === "IN" ? "+" : "−"}
													{formatMoney(p.amount)}
												</span>
												{settled > 0 && (
													<span className="text-xs text-muted-foreground">
														оплачено {formatMoney(p.settledAmount)}
													</span>
												)}
											</div>
											<Progress
												value={total > 0 ? settled / total : 0}
												tone={p.status === "SETTLED" ? "lime" : "brand"}
											/>
										</div>
										<div className="flex shrink-0 flex-wrap gap-1">
											<Button
												size="sm"
												variant="quiet"
												onClick={() => {
													setAllocFor(p);
													setAllocOpen(true);
												}}
											>
												<Link2 />
												Оплаты
											</Button>
											{canEdit && open && (
												<>
													<Button
														size="sm"
														variant="ghost"
														onClick={() => {
															setEditing(p);
															setFormOpen(true);
														}}
													>
														<Pencil />
														Изменить
													</Button>
													<CancelPlanButton
														companyId={companyId}
														accountId={accountId}
														plan={p}
													/>
												</>
											)}
										</div>
									</Card>
								</motion.li>
							);
						})}
					</AnimatePresence>
				</motion.ul>
			)}

			<PlanFormDialog
				open={formOpen}
				onClose={() => setFormOpen(false)}
				companyId={companyId}
				accountId={accountId}
				plan={editing}
			/>
			{allocFor && (
				<AllocationsDialog
					open={allocOpen}
					onClose={() => setAllocOpen(false)}
					companyId={companyId}
					accountId={accountId}
					plan={data?.items.find((x) => x.id === allocFor.id) ?? allocFor}
					canEdit={canEdit}
				/>
			)}
		</div>
	);
};

export default PlansPage;
