import { CalendarPlus, RotateCcw, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import type { Dashboard, Forecast } from "@/entities/Forecast";
import { spring, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { DynamicModuleLoader } from "@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader";
import type { ReducersList } from "@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader";
import { formatDay, formatDayShort } from "@/shared/lib/date/date";
import { formatMoney, formatSigned } from "@/shared/lib/format/money";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber/AnimatedNumber";
import { Button } from "@/shared/ui/Button/Button";
import { Chip } from "@/shared/ui/Chip/Chip";
import { DatePicker } from "@/shared/ui/DatePicker/DatePicker";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Select } from "@/shared/ui/Select/Select";
import { applyScenario } from "../model/lib/applyScenario";
import type { ScenarioResult } from "../model/lib/applyScenario";
import { initialWhatIf, whatIfActions, whatIfReducer } from "../model/slice/whatIfSlice";
import type { WhatIfSchema } from "../model/types/whatIfSchema";

const reducers: ReducersList = { whatIf: whatIfReducer };

interface WhatIfPanelProps {
	forecast: Forecast;
	upcoming: Dashboard["upcomingPayments"];
	/** Результат для графика (базовый vs негативный на одной оси) */
	onResult: (result: ScenarioResult | null) => void;
	/** Сохранить внеплановый расход как реальный план (обычный POST expected-payments) */
	onSaveExpense?: (amount: string, date: string) => void;
	canSave?: boolean;
}

const PCT_DROP = [0, 10, 20, 30];
const PCT_GROWTH = [0, 10, 20];
const WEEKS = [2, 3, 4];

const Inner = ({ forecast, upcoming, onResult, onSaveExpense, canSave }: WhatIfPanelProps) => {
	const dispatch = useAppDispatch();
	const s = useSelector((st: { whatIf?: WhatIfSchema }) => st.whatIf ?? initialWhatIf);
	const set = (patch: Partial<WhatIfSchema>) => dispatch(whatIfActions.set(patch));
	const inflows = useMemo(() => upcoming.filter((p) => p.direction === "IN"), [upcoming]);
	const plansCounted = forecast.scope === "WITH_KNOWN_PLANS";

	const result = useMemo(() => applyScenario(forecast, upcoming, s), [forecast, upcoming, s]);
	useEffect(() => {
		onResult(result.active ? result : null);
	}, [result, onResult]);
	useEffect(() => () => onResult(null), [onResult]);

	const horizonFirst = forecast.days[0]?.date;
	const horizonLast = forecast.days[forecast.days.length - 1]?.date;

	return (
		<div className="flex flex-col gap-5">
			<section className="flex flex-col gap-2">
				<h4 className="text-sm font-semibold">Клиент заплатит позже</h4>
				{inflows.length === 0 ? (
					<p className="text-xs text-muted-foreground">Нет ожидаемых поступлений — добавьте их в «Планы».</p>
				) : (
					<>
						<Select
							size="sm"
							value={s.delayedPlanId ?? ""}
							onChange={(v) => set({ delayedPlanId: v || null })}
							placeholder="Какое поступление задержится"
							options={[
								{ value: "", label: "Без задержки" },
								...inflows.map((p) => ({
									value: p.id,
									label: `${p.title} · ${formatMoney(p.remainingAmount)}`,
									hint: `ожидается ${formatDay(p.dueDate)}`,
								})),
							]}
						/>
						<div className="flex flex-wrap gap-1.5">
							{WEEKS.map((w) => (
								<Chip
									key={w}
									pressed={s.delayWeeks === w}
									onClick={() => set({ delayWeeks: w })}
									disabled={!s.delayedPlanId}
								>
									на {w} нед.
								</Chip>
							))}
						</div>
						{!plansCounted && (
							<p className="text-xs text-warning">
								Последний прогноз посчитан без планов — задержка не повлияет. Пересчитайте с планами.
							</p>
						)}
					</>
				)}
			</section>

			<section className="flex flex-col gap-2">
				<h4 className="text-sm font-semibold">Выручка снизится</h4>
				<div className="flex flex-wrap gap-1.5">
					{PCT_DROP.map((p) => (
						<Chip
							key={p}
							pressed={s.revenueDropPct === p}
							onClick={() => set({ revenueDropPct: p })}
						>
							{p === 0 ? "Нет" : `−${p}%`}
						</Chip>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-2">
				<h4 className="text-sm font-semibold">Вырастут постоянные расходы</h4>
				<div className="flex flex-wrap gap-1.5">
					{PCT_GROWTH.map((p) => (
						<Chip
							key={p}
							pressed={s.fixedCostGrowthPct === p}
							onClick={() => set({ fixedCostGrowthPct: p })}
						>
							{p === 0 ? "Нет" : `+${p}%`}
						</Chip>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-2">
				<h4 className="text-sm font-semibold">Внеплановый расход</h4>
				<div className="grid grid-cols-2 gap-2">
					<Field label="Сумма, ₽">
						<Input
							inputMode="decimal"
							value={s.extraExpense}
							onChange={(e) => set({ extraExpense: e.target.value.replace(/[^\d.,]/g, "") })}
							placeholder="150 000"
						/>
					</Field>
					<Field label="Дата">
						<DatePicker
							value={s.extraExpenseDate ?? ""}
							min={horizonFirst}
							max={horizonLast}
							onChange={(d) => set({ extraExpenseDate: d })}
							placeholder="Когда"
						/>
					</Field>
				</div>
			</section>

			<AnimatePresence initial={false}>
				{result.active && (
					<motion.div
						key="summary"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0, transition: tween.exit }}
						transition={spring.glide}
						className="overflow-hidden"
					>
						<div
							className={cn(
								"flex flex-col gap-2 rounded-lg p-4",
								result.firstGap
									? "bg-danger-soft text-danger-soft-foreground"
									: "bg-success-soft text-success-soft-foreground"
							)}
						>
							<div className="flex items-center gap-2 text-sm font-semibold">
								<Sparkles className="size-4" />
								{result.firstGap
									? `Разрыв ${formatDay(result.firstGap.date)}`
									: "Денег хватает на весь горизонт"}
							</div>
							{result.firstGap && (
								<div className="font-display text-2xl font-semibold tabular-nums">
									<AnimatedNumber
										value={result.firstGap.shortfall}
										format={(v) => `−${formatMoney(Math.max(0, v))}`}
									/>
								</div>
							)}
							<div className="text-xs opacity-80">
								Влияние сценария к {formatDayShort(horizonLast)}: {formatSigned(result.totalImpact)}
								{result.baseFirstGap
									? ` · в базовом прогнозе разрыв ${formatDayShort(result.baseFirstGap.date)}`
									: " · в базовом прогнозе разрыва нет"}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="flex flex-wrap gap-2">
				<Button
					size="sm"
					variant="ghost"
					onClick={() => dispatch(whatIfActions.reset())}
				>
					<RotateCcw />
					Сбросить
				</Button>
				{canSave && onSaveExpense && Number(s.extraExpense.replace(",", ".")) > 0 && s.extraExpenseDate && (
					<Button
						size="sm"
						variant="outline"
						onClick={() => onSaveExpense(s.extraExpense, s.extraExpenseDate!)}
					>
						<CalendarPlus />
						Добавить расход в планы
					</Button>
				)}
			</div>
			<p className="text-xs text-subtle-foreground">
				Сценарий — быстрая оценка поверх последнего прогноза: сдвигаем дневные потоки и смотрим остаток.
				Вероятности не пересчитываются.
			</p>
		</div>
	);
};

export const WhatIfPanel = memo((props: WhatIfPanelProps) => (
	<DynamicModuleLoader reducers={reducers}>
		<Inner {...props} />
	</DynamicModuleLoader>
));
