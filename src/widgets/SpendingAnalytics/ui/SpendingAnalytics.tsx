import { ArrowDownLeft, ArrowUpRight, Info, PieChart } from "lucide-react";
import { motion } from "motion/react";
import { memo, useMemo, useState } from "react";
import { useGetCategoryAnalyticsQuery, useGetCounterpartyAnalyticsQuery } from "@/entities/Analytics";
import type { AnalyticsTotal } from "@/entities/Analytics";
import { useCategoryNames } from "@/entities/Payment";
import type { Direction } from "@/shared/api/types";
import { fadeUp, spring, stagger } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, diffDays, todayIso } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { plural } from "@/shared/lib/format/plural";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";
import type { DateRange } from "@/shared/ui/DatePicker/DatePicker";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";

interface SpendingAnalyticsProps {
	companyId: string;
	accountId: string;
	/** Последний день с данными счёта: период по умолчанию — 90 дней до него */
	dataEnd?: string | null;
}

type View = "categories" | "counterparties";
type DirectionFilter = "" | Direction;

const MAX_DAYS = 366;
const TOP = 12;

interface Row {
	key: string;
	title: string;
	sub?: string;
	amount: string;
	count: number;
	share: number;
}

const BarList = ({ rows, direction }: { rows: Row[]; direction: Direction }) => {
	const [all, setAll] = useState(false);
	const shown = all ? rows : rows.slice(0, TOP);
	return (
		<>
			<motion.ul
				variants={stagger(0.03)}
				initial="hidden"
				animate="show"
				className="flex flex-col gap-1.5 p-2 sm:p-3"
			>
				{shown.map((r) => (
					<motion.li
						key={r.key}
						variants={fadeUp}
						className="relative overflow-hidden rounded-md px-3 py-2.5"
					>
						<motion.span
							aria-hidden
							className={cn(
								"absolute inset-y-0 left-0 rounded-md",
								direction === "IN" ? "bg-success-soft" : "bg-surface"
							)}
							initial={{ width: 0 }}
							animate={{ width: `${Math.min(100, Math.max(1, r.share))}%` }}
							transition={spring.glide}
						/>
						<div className="relative flex items-center gap-3">
							<div className="min-w-0 flex-1">
								<div className="truncate text-sm font-medium">{r.title}</div>
								<div className="truncate text-xs text-muted-foreground">
									{r.sub ? `${r.sub} · ` : ""}
									{r.count} {plural(r.count, "операция", "операции", "операций")}
								</div>
							</div>
							<div className="text-right">
								<div className="font-display text-sm font-semibold whitespace-nowrap tabular-nums">
									{formatMoney(r.amount)}
								</div>
								<div className="text-xs text-muted-foreground tabular-nums">
									{r.share.toFixed(1).replace(".", ",")}%
								</div>
							</div>
						</div>
					</motion.li>
				))}
			</motion.ul>
			{rows.length > TOP && (
				<div className="px-4 pb-4">
					<Button
						size="sm"
						variant="quiet"
						onClick={() => setAll((v) => !v)}
					>
						{all ? "Свернуть" : `Показать все · ${rows.length}`}
					</Button>
				</div>
			)}
		</>
	);
};

const totalOf = (totals: AnalyticsTotal[] | undefined, d: Direction) => totals?.find((t) => t.direction === d);

/**
 * Куда уходят и откуда приходят деньги: категории и контрагенты за период. Доля — процент от оборота того же
 * направления. Цифры отражают текущее состояние данных (исправленные категории учтены, аннулированные — нет),
 * планы и прогноз не входят. Отсутствие платежей не значит, что история полная.
 */
export const SpendingAnalytics = memo(({ companyId, accountId, dataEnd }: SpendingAnalyticsProps) => {
	const end = dataEnd ?? addDays(todayIso(), -1);
	const [picked, setPicked] = useState<DateRange | null>(null);
	const range = picked ?? { from: addDays(end, -89), to: end };
	const [view, setView] = useState<View>("categories");
	const [direction, setDirection] = useState<DirectionFilter>("");
	const names = useCategoryNames(companyId);

	const tooLong = diffDays(range.from, range.to) + 1 > MAX_DAYS;
	const args = { companyId, accountId, fromDate: range.from, toDate: range.to, direction: direction || undefined };
	const cats = useGetCategoryAnalyticsQuery(args, { skip: view !== "categories" || tooLong });
	const cps = useGetCounterpartyAnalyticsQuery(args, { skip: view !== "counterparties" || tooLong });
	const q = view === "categories" ? cats : cps;
	const data = q.data;

	const rows = useMemo(() => {
		const out: Record<Direction, Row[]> = { IN: [], OUT: [] };
		if (view === "categories" && cats.data) {
			for (const i of cats.data.items)
				out[i.direction].push({
					key: `${i.direction}:${i.categoryCode}`,
					title: names(i.categoryCode),
					amount: i.amount,
					count: i.paymentCount,
					share: Number(i.sharePercent) || 0,
				});
		}
		if (view === "counterparties" && cps.data) {
			for (const i of cps.data.items)
				out[i.direction].push({
					key: `${i.direction}:${i.counterpartyKey ?? "none"}`,
					title: i.counterpartyName ?? i.counterpartyKey ?? "Контрагент не определён",
					sub: i.counterpartyInn ? `ИНН ${i.counterpartyInn}` : undefined,
					amount: i.amount,
					count: i.paymentCount,
					share: Number(i.sharePercent) || 0,
				});
		}
		return out;
	}, [view, cats.data, cps.data, names]);

	const directions: Direction[] = direction ? [direction] : ["IN", "OUT"];
	const inT = totalOf(data?.totals, "IN");
	const outT = totalOf(data?.totals, "OUT");

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
					<div className="lg:w-64">
						<DateRangePicker
							value={range}
							onChange={setPicked}
							max={todayIso()}
							presets={[
								{ label: "30 дней", range: { from: addDays(end, -29), to: end } },
								{ label: "90 дней", range: { from: addDays(end, -89), to: end } },
								{ label: "Полгода", range: { from: addDays(end, -181), to: end } },
								{ label: "Год", range: { from: addDays(end, -364), to: end } },
							]}
						/>
					</div>
					<Segmented
						value={view}
						onChange={setView}
						label="Разрез"
						options={[
							{ value: "categories", label: "По категориям", icon: <PieChart /> },
							{ value: "counterparties", label: "По контрагентам" },
						]}
					/>
					<Segmented
						value={direction}
						onChange={setDirection}
						label="Направление"
						options={[
							{ value: "", label: "Все" },
							{ value: "IN", label: "Поступления", icon: <ArrowDownLeft /> },
							{ value: "OUT", label: "Списания", icon: <ArrowUpRight /> },
						]}
					/>
				</div>
			</Card>

			{tooLong ? (
				<Card>
					<EmptyState
						icon={<Info />}
						title="Период слишком длинный"
						text="Аналитика считается за период от 1 до 366 дней. Выберите период короче."
					/>
				</Card>
			) : q.isLoading ? (
				<Skeleton className="h-72 rounded-xl" />
			) : q.error || !data ? (
				<Card>
					<ErrorState
						error={q.error}
						onRetry={q.refetch}
					/>
				</Card>
			) : (
				<>
					<motion.dl
						variants={stagger(0.05)}
						initial="hidden"
						animate="show"
						className="grid grid-cols-2 gap-3"
					>
						{directions.map((d) => {
							const t = d === "IN" ? inT : outT;
							return (
								<Stat
									key={d}
									tone={d === "IN" ? "hero" : "plain"}
									icon={d === "IN" ? <ArrowDownLeft /> : <ArrowUpRight />}
									label={d === "IN" ? "Поступило" : "Списано"}
									value={formatMoney(t?.amount ?? "0.00")}
									sub={`${t?.paymentCount ?? 0} ${plural(t?.paymentCount ?? 0, "операция", "операции", "операций")}`}
								/>
							);
						})}
					</motion.dl>

					<div className={cn("grid gap-4", directions.length === 2 && "xl:grid-cols-2")}>
						{directions.map((d) => (
							<Card key={d}>
								<CardHeader>
									<CardTitle>
										{d === "IN" ? "Откуда приходят деньги" : "Куда уходят деньги"}
									</CardTitle>
								</CardHeader>
								{rows[d].length === 0 ? (
									<EmptyState
										title="Операций нет"
										text="За выбранный период нет операций этого направления."
									/>
								) : (
									<BarList
										rows={rows[d]}
										direction={d}
									/>
								)}
							</Card>
						))}
					</div>
					<p className="flex items-start gap-2 text-xs text-muted-foreground">
						<Info className="mt-0.5 size-3.5 shrink-0" />
						Доля — от оборота того же направления. Учтены фактические операции с исправленными категориями,
						аннулированные не входят; планы и прогноз не считаются. Отсутствие операций не значит, что
						история за период полная.
					</p>
				</>
			)}
		</div>
	);
});
