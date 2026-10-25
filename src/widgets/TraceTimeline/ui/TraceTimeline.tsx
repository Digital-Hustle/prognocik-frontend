import { ChevronDown } from "lucide-react";
import { memo, useMemo, useState } from "react";
import type { TraceStep } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn/cn";
import { formatMoneyExact } from "@/shared/lib/format/money";
import { AutoHeight } from "@/shared/ui/AutoHeight/AutoHeight";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";

/** Подписи известных стадий; состав не фиксирован, неизвестную стадию показываем как есть */
const STAGE_LABEL: Record<string, string> = {
	VALIDATE: "Проверка входа",
	TRAINING_WINDOW: "Окно обучения",
	RECURRING_EXCLUDED: "Регулярные платежи",
	PLANS: "Планы",
	RESIDUAL_LEVEL: "Остаточный уровень",
	DAY: "День прогноза",
	POINT_RESULT: "Точечный результат",
	RISK: "Оценка риска",
	GAP: "Кассовые разрывы",
	EXPERIMENT: "Эксперимент",
	ORIGIN: "Отсечка",
	METRICS: "Метрики",
	CONFUSION_MATRIX: "Матрица ошибок",
	BENCHMARK: "Эталонные модели",
	MODEL_SELECTION: "Выбор модели",
};

const MONEY = /^-?\d+\.\d{2}$/;
const valueText = (v: string) => (MONEY.test(v) ? formatMoneyExact(v) : v);

type Group = { stage: string; steps: TraceStep[] };

/** Подряд идущие шаги одной «многошаговой» стадии (DAY ×30, ORIGIN) схлопываем в одну группу */
const COLLAPSE = new Set(["DAY", "ORIGIN"]);

function group(steps: TraceStep[]): Group[] {
	const out: Group[] = [];
	for (const s of steps) {
		const last = out[out.length - 1];
		if (last && last.stage === s.stage && COLLAPSE.has(s.stage)) last.steps.push(s);
		else out.push({ stage: s.stage, steps: [s] });
	}
	return out;
}

const Step = ({ step }: { step: TraceStep }) => {
	const entries = Object.entries(step.data ?? {});
	return (
		<li className="flex gap-3 py-2">
			<span className="mt-0.5 w-7 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
				{step.seq}
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm break-words">{step.message}</p>
				{entries.length > 0 && (
					<dl className="mt-1.5 flex flex-wrap gap-1.5">
						{entries.map(([k, v]) => (
							<div
								key={k}
								className="flex gap-1.5 rounded-2xs bg-muted px-2 py-1 text-xs"
							>
								<dt className="text-muted-foreground">{k}</dt>
								<dd className="font-medium tabular-nums">{valueText(v)}</dd>
							</div>
						))}
					</dl>
				)}
			</div>
		</li>
	);
};

const GroupBlock = ({ g }: { g: Group }) => {
	const many = g.steps.length > 1;
	const [open, setOpen] = useState(!many);
	const label = STAGE_LABEL[g.stage] ?? g.stage;
	return (
		<li className="rounded-lg border border-border">
			<button
				type="button"
				onClick={() => many && setOpen((o) => !o)}
				aria-expanded={many ? open : undefined}
				className={cn(
					"flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
					many && "hover:bg-muted"
				)}
			>
				<span className="rounded-2xs bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
					{label}
				</span>
				{many && (
					<>
						<span className="text-xs text-muted-foreground">{g.steps.length} шагов</span>
						<ChevronDown
							className={cn(
								"ml-auto size-4 text-muted-foreground transition-transform",
								open && "rotate-180"
							)}
						/>
					</>
				)}
			</button>
			<AutoHeight>
				{open && (
					<ol className="divide-y divide-border px-3 pb-2">
						{g.steps.map((s) => (
							<Step
								key={s.seq}
								step={s}
							/>
						))}
					</ol>
				)}
			</AutoHeight>
		</li>
	);
};

/**
 * Пошаговый лог расчёта. 30 шагов DAY и отсечки свёрнуты по умолчанию. null/пусто — результат посчитан до
 * обновления бэка: просим пересчитать, а не показываем ошибку.
 */
export const TraceTimeline = memo(({ trace }: { trace: TraceStep[] | null | undefined }) => {
	const groups = useMemo(() => group(trace ?? []), [trace]);
	if (!trace || trace.length === 0) {
		return (
			<EmptyState
				title="Лога расчёта нет"
				text="Этот результат посчитан до обновления сервиса. Пересчитайте, чтобы увидеть шаги."
			/>
		);
	}
	return (
		<ol className="flex flex-col gap-2">
			{groups.map((g) => (
				<GroupBlock
					key={g.steps[0].seq}
					g={g}
				/>
			))}
		</ol>
	);
});
