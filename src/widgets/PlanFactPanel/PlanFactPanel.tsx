import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useCategoryNames } from "@/entities/Payment";
import { useGetPlanFactQuery } from "@/entities/PlanFact";
import type { GroupBy, OverduePlan, UnplannedFact } from "@/entities/PlanFact";
import { fadeUp, stagger } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, formatDayShort, todayIso } from "@/shared/lib/date/date";
import { formatMoney, formatSigned, toNumber } from "@/shared/lib/format/money";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";
import type { DateRange } from "@/shared/ui/DatePicker/DatePicker";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { PlanFactChart } from "./PlanFactChart";

export const PlanFactPanel = ({ companyId, accountId }: { companyId: string; accountId: string }) => {
	const names = useCategoryNames(companyId);
	const [range, setRange] = useState<DateRange>({ from: addDays(todayIso(), -42), to: addDays(todayIso(), 28) });
	const [groupBy, setGroupBy] = useState<GroupBy>("WEEK");
	const [direction, setDirection] = useState<"IN" | "OUT">("IN");
	const { data, isLoading, isFetching, error, refetch } = useGetPlanFactQuery({
		companyId,
		accountId,
		fromDate: range.from,
		toDate: range.to,
		groupBy,
	});

	const overdue = useMemo(() => {
		const map = new Map<string, OverduePlan>();
		data?.periods.forEach((p) => p.overduePlans.forEach((o) => map.set(o.id, o)));
		return [...map.values()];
	}, [data]);
	const unplanned = useMemo(() => {
		const map = new Map<string, UnplannedFact>();
		data?.periods.forEach((p) => p.unplannedFacts.forEach((u) => map.set(u.id, u)));
		return [...map.values()].sort(
			(a, b) => (toNumber(b.unallocatedAmount) ?? 0) - (toNumber(a.unallocatedAmount) ?? 0)
		);
	}, [data]);

	const t = data?.totals;

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
				<div className="sm:w-64">
					<DateRangePicker
						value={range}
						onChange={setRange}
						presets={[
							{
								label: "6 недель назад + 4 вперёд",
								range: { from: addDays(todayIso(), -42), to: addDays(todayIso(), 28) },
							},
							{ label: "Последние 30 дней", range: { from: addDays(todayIso(), -30), to: todayIso() } },
							{ label: "Последние 90 дней", range: { from: addDays(todayIso(), -90), to: todayIso() } },
						]}
					/>
				</div>
				<Segmented
					value={groupBy}
					onChange={setGroupBy}
					label="Группировка"
					options={[
						{ value: "DAY", label: "По дням" },
						{ value: "WEEK", label: "По неделям" },
					]}
				/>
				<Segmented
					value={direction}
					onChange={setDirection}
					label="Направление"
					options={[
						{ value: "IN", label: "Поступления", icon: <ArrowDownLeft /> },
						{ value: "OUT", label: "Списания", icon: <ArrowUpRight /> },
					]}
				/>
			</div>

			{isLoading ? (
				<Skeleton className="h-96 rounded-xl" />
			) : error || !data || !t ? (
				<Card>
					<ErrorState
						error={error}
						onRetry={refetch}
					/>
				</Card>
			) : (
				<>
					<motion.dl
						variants={stagger(0.05)}
						initial="hidden"
						animate="show"
						className="grid grid-cols-2 gap-3 lg:grid-cols-4"
					>
						<Stat
							label={direction === "IN" ? "Планировали получить" : "Планировали заплатить"}
							value={formatMoney(direction === "IN" ? t.plannedIn : t.plannedOut)}
						/>
						<Stat
							tone="hero"
							label={direction === "IN" ? "Получили" : "Заплатили"}
							value={formatMoney(direction === "IN" ? t.actualIn : t.actualOut)}
						/>
						<Stat
							tone={
								(toNumber(direction === "IN" ? t.varianceIn : t.varianceOut) ?? 0) < 0
									? "danger"
									: "plain"
							}
							label="Отклонение"
							value={formatSigned(direction === "IN" ? t.varianceIn : t.varianceOut)}
							sub={`вне плана ${formatMoney(direction === "IN" ? t.unplannedIn : t.unplannedOut)}`}
						/>
						<Stat
							tone={
								(toNumber(direction === "IN" ? t.overdueRemainingIn : t.overdueRemainingOut) ?? 0) > 0
									? "lime"
									: "plain"
							}
							label="Не пришло в срок"
							value={formatMoney(direction === "IN" ? t.overdueRemainingIn : t.overdueRemainingOut)}
							sub={`ещё ожидается ${formatMoney(direction === "IN" ? t.remainingIn : t.remainingOut)}`}
						/>
					</motion.dl>

					<Card>
						<CardHeader>
							<CardTitle>{direction === "IN" ? "Поступления" : "Списания"}: план и факт</CardTitle>
							{isFetching && <span className="text-xs text-muted-foreground">обновляем…</span>}
						</CardHeader>
						<div className="px-2 pt-2 pb-4 sm:px-4">
							{data.periods.length === 0 ? (
								<EmptyState
									icon={<BarChart3 />}
									title="Нет данных за период"
								/>
							) : (
								<PlanFactChart
									data={data}
									direction={direction}
								/>
							)}
							<div className="mt-2 flex flex-wrap gap-4 px-2 text-xs text-muted-foreground">
								<span className="flex items-center gap-1.5">
									<span className="size-2.5 rounded-2xs bg-chart-plan opacity-40" />
									План
								</span>
								<span className="flex items-center gap-1.5">
									<span
										className={cn(
											"size-2.5 rounded-2xs",
											direction === "IN" ? "bg-chart-in" : "bg-chart-out"
										)}
									/>
									Факт
								</span>
								<span className="flex items-center gap-1.5">
									<span className="size-2.5 rounded-2xs bg-chart-lime" />
									Факт ниже плана
								</span>
							</div>
						</div>
					</Card>

					<div className="grid gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Не исполнены в срок</CardTitle>
								<AlertTriangle className="size-5 text-warning" />
							</CardHeader>
							{overdue.length === 0 ? (
								<EmptyState title="Все планы исполнены вовремя" />
							) : (
								<motion.ul
									variants={stagger(0.04)}
									initial="hidden"
									animate="show"
									className="flex flex-col gap-1 p-2 sm:p-3"
								>
									{overdue.map((o) => (
										<motion.li
											key={o.id}
											variants={fadeUp}
											className="flex items-center gap-3 rounded-md bg-warning-soft px-3 py-2.5 text-sm text-warning-soft-foreground"
										>
											<span className="min-w-0 flex-1">
												<span className="block truncate font-medium">{o.title}</span>
												<span className="text-xs opacity-80">
													срок {formatDayShort(o.dueDate)} · оплачено{" "}
													{formatMoney(o.settledAmount)} из {formatMoney(o.amount)}
												</span>
											</span>
											<span className="font-semibold whitespace-nowrap tabular-nums">
												{formatMoney(o.remainingAmount)}
											</span>
										</motion.li>
									))}
								</motion.ul>
							)}
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Вне плана</CardTitle>
								<Shuffle className="size-5 text-muted-foreground" />
							</CardHeader>
							{unplanned.length === 0 ? (
								<EmptyState title="Все операции соответствуют планам" />
							) : (
								<motion.ul
									variants={stagger(0.03)}
									initial="hidden"
									animate="show"
									className="flex max-h-96 flex-col gap-1 overflow-y-auto p-2 sm:p-3"
								>
									{unplanned.slice(0, 50).map((u) => (
										<motion.li
											key={u.id}
											variants={fadeUp}
											className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
										>
											<span className="w-14 shrink-0 text-xs text-muted-foreground">
												{formatDayShort(u.operationDate)}
											</span>
											<span className="min-w-0 flex-1">
												<span className="block truncate">
													{u.counterpartyName ?? "Без контрагента"}
												</span>
												<span className="text-xs text-muted-foreground">
													{names(u.categoryCode)}
												</span>
											</span>
											<span
												className={cn(
													"font-medium whitespace-nowrap tabular-nums",
													u.direction === "IN" && "text-success-soft-foreground"
												)}
											>
												{u.direction === "IN" ? "+" : "−"}
												{formatMoney(u.unallocatedAmount)}
											</span>
										</motion.li>
									))}
								</motion.ul>
							)}
						</Card>
					</div>
				</>
			)}
		</div>
	);
};
