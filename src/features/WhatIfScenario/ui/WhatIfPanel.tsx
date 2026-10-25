import { CalendarPlus, Coins, RotateCcw, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useListExpectedPaymentsQuery } from "@/entities/ExpectedPayment";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import type { Forecast } from "@/entities/Forecast";
import { problemMessage } from "@/shared/api/problem";
import { spring, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { DynamicModuleLoader } from "@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader";
import type { ReducersList } from "@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader";
import { formatDay } from "@/shared/lib/date/date";
import { formatMoney, formatSigned } from "@/shared/lib/format/money";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber/AnimatedNumber";
import { Button } from "@/shared/ui/Button/Button";
import { Chip } from "@/shared/ui/Chip/Chip";
import { DatePicker } from "@/shared/ui/DatePicker/DatePicker";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Select } from "@/shared/ui/Select/Select";
import { Switch } from "@/shared/ui/Switch/Switch";
import { useMaxPaymentMutation, usePreviewScenarioMutation } from "../api/scenarioApi";
import { buildChanges, normalizeAmount, toScenarioResult } from "../model/lib/scenarioResult";
import type { ScenarioResult } from "../model/lib/scenarioResult";
import { initialWhatIf, whatIfActions, whatIfReducer } from "../model/slice/whatIfSlice";
import type { MaxPayment, ScenarioPreview } from "../model/types/scenario";
import type { CostTarget, WhatIfSchema } from "../model/types/whatIfSchema";

const reducers: ReducersList = { whatIf: whatIfReducer };

interface WhatIfPanelProps {
	companyId: string;
	accountId: string;
	forecast: Forecast;
	/** Результат для графика (базовый vs негативный на одной оси) */
	onResult: (result: ScenarioResult | null) => void;
	/** Сохранить внеплановый расход как реальный план (обычный POST expected-payments) */
	onSaveExpense?: (amount: string, date: string) => void;
	canSave?: boolean;
}

const PCT_DROP = [10, 20, 30];
const PCT_GROWTH = [10, 20, 30];
/** По ТЗ кейса: клиент платит на 2–4 недели позже */
const DELAY_DAYS = [14, 21, 28];
const TARGETS: Array<{ value: CostTarget; label: string }> = [
	{ value: "RECURRING", label: "Регулярные" },
	{ value: "ALL_OUTFLOWS", label: "Все расходы" },
];

const EFFECT_LABEL: Record<string, string> = {
	DELAY_RECEIPT: "Клиент заплатит позже",
	DELAY_PAYMENT: "Мы заплатим позже",
	CANCEL_PLAN: "Оплата не придёт",
	REVENUE_DROP: "Выручка снизится",
	UNPLANNED_EXPENSE: "Внеплановый расход",
	UNPLANNED_INCOME: "Разовое поступление",
	FIXED_COSTS_GROWTH: "Рост расходов",
};

const open = (p: ExpectedPayment) => p.status === "OPEN" || p.status === "PARTIALLY_SETTLED";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<section className="flex flex-col gap-2">
		<h4 className="text-sm font-semibold">{title}</h4>
		{children}
	</section>
);

const Inner = ({ companyId, accountId, forecast, onResult, onSaveExpense, canSave }: WhatIfPanelProps) => {
	const dispatch = useAppDispatch();
	const s = useSelector((st: { whatIf?: WhatIfSchema }) => st.whatIf ?? initialWhatIf);
	const set = (patch: Partial<WhatIfSchema>) => dispatch(whatIfActions.set(patch));
	const plansCounted = forecast.scope === "WITH_KNOWN_PLANS";

	const horizonFirst = forecast.days[0]?.date;
	const horizonLast = forecast.days[forecast.days.length - 1]?.date;
	const plans = useListExpectedPaymentsQuery(
		{ companyId, accountId, from: horizonFirst ?? "", to: horizonLast ?? "" },
		{ skip: !horizonFirst || !horizonLast }
	);
	const inflows = useMemo(
		() => (plans.data?.items ?? []).filter((p) => open(p) && p.direction === "IN"),
		[plans.data]
	);
	const outflows = useMemo(
		() => (plans.data?.items ?? []).filter((p) => open(p) && p.direction === "OUT"),
		[plans.data]
	);
	const planOptions = (list: ExpectedPayment[], none: string) => [
		{ value: "", label: none },
		...list.map((p) => ({
			value: p.id,
			label: `${p.title} · ${formatMoney(p.remainingAmount)}`,
			hint: formatDay(p.dueDate),
		})),
	];

	// Каждое изменение рычага — новый быстрый запрос; ответы устаревших запросов отбрасываем
	const [run] = usePreviewScenarioMutation();
	const changes = useMemo(() => buildChanges(s), [s]);
	const [preview, setPreview] = useState<ScenarioPreview | null>(null);
	const [error, setError] = useState<string | null>(null);
	const seq = useRef(0);
	useEffect(() => {
		const id = ++seq.current;
		if (changes.length === 0) {
			setPreview(null);
			setError(null);
			return;
		}
		const timer = setTimeout(async () => {
			const rs = await run({ companyId, accountId, body: { forecastId: forecast.id, changes } });
			if (id !== seq.current) return;
			if ("error" in rs) {
				setError(problemMessage(rs.error));
				setPreview(null);
			} else {
				setError(null);
				setPreview(rs.data);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [changes, run, companyId, accountId, forecast.id]);

	const result = useMemo(() => (preview ? toScenarioResult(preview) : null), [preview]);
	useEffect(() => {
		onResult(result);
	}, [result, onResult]);
	useEffect(() => () => onResult(null), [onResult]);

	// «Сколько можно заплатить на дату»
	const [calc, calcState] = useMaxPaymentMutation();
	const [payDate, setPayDate] = useState<string>("");
	const [keepBuffer, setKeepBuffer] = useState(false);
	const [maxPay, setMaxPay] = useState<MaxPayment | null>(null);
	const [payError, setPayError] = useState<string | null>(null);
	const askMax = async () => {
		setPayError(null);
		if (!payDate) return setPayError("Выберите дату платежа.");
		const rs = await calc({
			companyId,
			accountId,
			body: { forecastId: forecast.id, date: payDate, keepBuffer, changes: changes.length ? changes : undefined },
		});
		if ("error" in rs) {
			setMaxPay(null);
			return setPayError(problemMessage(rs.error));
		}
		setMaxPay(rs.data);
	};

	const stale = preview?.baseForecast.staleness === "STALE";
	const expenseOk = Boolean(normalizeAmount(s.extraExpense) && s.extraExpenseDate);

	return (
		<div className="flex flex-col gap-5">
			{!plansCounted && (
				<p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
					Прогноз посчитан без планов, поэтому задержки и отмена платежей недоступны. Пересчитайте его «с
					планами».
				</p>
			)}

			{error && (
				<p
					role="alert"
					className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
				>
					{error}
				</p>
			)}

			<AnimatePresence initial={false}>
				{result && (
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
									{result.firstGap.shortfallDate && (
										<span className="block text-xs font-normal opacity-80">
											не хватит к {formatDay(result.firstGap.shortfallDate)}
										</span>
									)}
								</div>
							)}
							<div className="text-xs opacity-80">
								{result.newGap
									? "В базовом прогнозе разрыва нет — сценарий его создаёт."
									: result.gapEarlier
										? `Разрыв наступает раньше на ${Math.abs(result.gapShiftDays ?? 0)} дн.`
										: result.baseFirstGapDate
											? `В базовом прогнозе разрыв ${formatDay(result.baseFirstGapDate)}.`
											: "В базовом прогнозе разрыва нет."}
								{result.additionalShortfall > 0 &&
									` Яма глубже на ${formatMoney(result.additionalShortfall)}.`}
								{result.firstBufferBreachDate &&
									` Ниже буфера с ${formatDay(result.firstBufferBreachDate)}.`}
								{` Влияние к концу периода: ${formatSigned(result.totalImpact)}.`}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{preview && preview.changes.length > 0 && (
				<ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
					{preview.changes.map((c, i) => (
						<li
							key={`${c.type}${i}`}
							className="flex flex-col gap-0.5 px-3 py-2"
						>
							<div className="flex items-baseline justify-between gap-3">
								<span className="font-medium">{c.title ?? EFFECT_LABEL[c.type] ?? c.type}</span>
								<span className="shrink-0 font-display font-semibold tabular-nums">
									{formatSigned(c.minimumBalanceDelta)}
								</span>
							</div>
							<span className="text-xs text-muted-foreground">
								{EFFECT_LABEL[c.type] ?? c.type}: ухудшает минимальный остаток
								{c.movedTo ? ` · платёж сдвигается на ${formatDay(c.movedTo)}` : ""}
								{c.droppedAmount && Number(c.droppedAmount) > 0
									? ` · ${formatMoney(c.droppedAmount)} выходит за окно прогноза`
									: ""}
								{c.note ? ` · ${c.note}` : ""}
							</span>
						</li>
					))}
				</ul>
			)}

			<Section title="Клиент заплатит позже">
				{inflows.length === 0 ? (
					<p className="text-xs text-muted-foreground">Нет ожидаемых поступлений — добавьте их в «Планы».</p>
				) : (
					<>
						<Select
							size="sm"
							value={s.delayReceiptPlanId ?? ""}
							onChange={(v) => set({ delayReceiptPlanId: v || null })}
							placeholder="Какое поступление задержится"
							options={planOptions(inflows, "Без задержки")}
						/>
						<div className="flex flex-wrap gap-1.5">
							{DELAY_DAYS.map((d) => (
								<Chip
									key={d}
									pressed={s.delayReceiptDays === d}
									onClick={() => set({ delayReceiptDays: d })}
									disabled={!s.delayReceiptPlanId}
								>
									на {d / 7} нед.
								</Chip>
							))}
						</div>
					</>
				)}
			</Section>

			{inflows.length > 0 && (
				<Section title="Оплата по счёту не придёт">
					<Select
						size="sm"
						value={s.cancelPlanId ?? ""}
						onChange={(v) => set({ cancelPlanId: v || null })}
						placeholder="Какой платёж не придёт"
						options={planOptions(inflows, "Все придут")}
					/>
				</Section>
			)}

			{outflows.length > 0 && (
				<Section title="Отложить наш платёж">
					<Select
						size="sm"
						value={s.delayPaymentPlanId ?? ""}
						onChange={(v) => set({ delayPaymentPlanId: v || null })}
						placeholder="Какой платёж отложить"
						options={planOptions(outflows, "Не откладывать")}
					/>
					<div className="flex flex-wrap gap-1.5">
						{DELAY_DAYS.map((d) => (
							<Chip
								key={d}
								pressed={s.delayPaymentDays === d}
								onClick={() => set({ delayPaymentDays: d })}
								disabled={!s.delayPaymentPlanId}
							>
								на {d / 7} нед.
							</Chip>
						))}
					</div>
				</Section>
			)}

			<Section title="Выручка снизится">
				<div className="flex flex-wrap gap-1.5">
					<Chip
						pressed={s.revenueDropPct === 0}
						onClick={() => set({ revenueDropPct: 0 })}
					>
						Нет
					</Chip>
					{PCT_DROP.map((p) => (
						<Chip
							key={p}
							pressed={s.revenueDropPct === p}
							onClick={() => set({ revenueDropPct: p })}
						>
							−{p}%
						</Chip>
					))}
				</div>
			</Section>

			<Section title="Вырастут расходы">
				<div className="flex flex-wrap gap-1.5">
					<Chip
						pressed={s.costGrowthPct === 0}
						onClick={() => set({ costGrowthPct: 0 })}
					>
						Нет
					</Chip>
					{PCT_GROWTH.map((p) => (
						<Chip
							key={p}
							pressed={s.costGrowthPct === p}
							onClick={() => set({ costGrowthPct: p })}
						>
							+{p}%
						</Chip>
					))}
				</div>
				{s.costGrowthPct > 0 && (
					<Segmented
						size="sm"
						value={s.costTarget}
						onChange={(v) => set({ costTarget: v })}
						label="Какие расходы растут"
						options={TARGETS}
					/>
				)}
			</Section>

			<Section title="Внеплановый расход">
				<div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
					<Field label="Сумма, ₽">
						<Input
							inputMode="decimal"
							value={s.extraExpense}
							onChange={(e) => set({ extraExpense: e.target.value.replace(/[^\d.,\s]/g, "") })}
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
			</Section>

			<Section title="Разовое поступление (кредит, предоплата)">
				<div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
					<Field label="Сумма, ₽">
						<Input
							inputMode="decimal"
							value={s.extraIncome}
							onChange={(e) => set({ extraIncome: e.target.value.replace(/[^\d.,\s]/g, "") })}
							placeholder="300 000"
						/>
					</Field>
					<Field label="Дата">
						<DatePicker
							value={s.extraIncomeDate ?? ""}
							min={horizonFirst}
							max={horizonLast}
							onChange={(d) => set({ extraIncomeDate: d })}
							placeholder="Когда"
						/>
					</Field>
				</div>
			</Section>

			{(stale || (preview?.notes.length ?? 0) > 0) && (
				<ul className="flex flex-col gap-1 text-xs text-muted-foreground">
					{preview?.notes.map((n) => (
						<li key={n}>{n}</li>
					))}
				</ul>
			)}

			<div className="flex flex-wrap gap-2">
				<Button
					size="sm"
					variant="ghost"
					onClick={() => {
						dispatch(whatIfActions.reset());
						setMaxPay(null);
					}}
				>
					<RotateCcw />
					Сбросить
				</Button>
				{canSave && onSaveExpense && expenseOk && (
					<Button
						size="sm"
						variant="outline"
						onClick={() => onSaveExpense(normalizeAmount(s.extraExpense)!, s.extraExpenseDate!)}
					>
						<CalendarPlus />
						Добавить расход в планы
					</Button>
				)}
			</div>

			<div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
				<h4 className="flex items-center gap-2 text-sm font-semibold">
					<Coins className="size-4" />
					Сколько можно заплатить на дату
				</h4>
				<div className="grid grid-cols-1 items-end gap-2 min-[420px]:grid-cols-2">
					<Field label="Дата платежа">
						<DatePicker
							value={payDate}
							min={horizonFirst}
							max={horizonLast}
							onChange={setPayDate}
							placeholder="Когда платить"
						/>
					</Field>
					<label className="flex items-center gap-2 pb-2.5 text-sm">
						<Switch
							checked={keepBuffer}
							onChange={setKeepBuffer}
							label="Не уходить ниже буфера"
						/>
						Держать буфер
					</label>
				</div>
				<Button
					size="sm"
					variant="outline"
					disabled={calcState.isLoading}
					onClick={() => void askMax()}
				>
					{calcState.isLoading ? "Считаем…" : "Посчитать"}
				</Button>
				{payError && (
					<p
						role="alert"
						className="text-sm text-danger"
					>
						{payError}
					</p>
				)}
				{maxPay && (
					<div className="flex flex-col gap-1 text-sm">
						<div>
							{Number(maxPay.scenario.maxAmount) > 0 ? (
								<>
									Можно заплатить до{" "}
									<b className="font-display tabular-nums">
										{formatMoney(maxPay.scenario.maxAmount)}
									</b>{" "}
									{formatDay(maxPay.date)}
								</>
							) : (
								<b>Платить на эту дату нельзя: разрыв будет и без платежа.</b>
							)}
							{maxPay.scenario.limitingDate && Number(maxPay.scenario.maxAmount) > 0 && (
								<span className="text-muted-foreground">
									{" "}
									· упрётся {formatDay(maxPay.scenario.limitingDate)}
								</span>
							)}
						</div>
						{changes.length > 0 && (
							<div className="text-xs text-muted-foreground">
								Без сценария можно было бы заплатить до {formatMoney(maxPay.base.maxAmount)}.
							</div>
						)}
						{maxPay.notes.map((n) => (
							<div
								key={n}
								className="text-xs text-muted-foreground"
							>
								{n}
							</div>
						))}
					</div>
				)}
			</div>

			<p className="text-xs text-subtle-foreground">
				Расчёт делает сервер поверх последнего прогноза: сдвигает дневные потоки и сравнивает остатки.
				Вероятность разрыва в сценарии не пересчитывается — показаны суммы и даты.
			</p>
		</div>
	);
};

export const WhatIfPanel = memo((props: WhatIfPanelProps) => (
	<DynamicModuleLoader reducers={reducers}>
		<Inner {...props} />
	</DynamicModuleLoader>
));
