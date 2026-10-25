import { memo } from "react";
import type { ConfusionMatrix } from "@/entities/Backtest";
import { cn } from "@/shared/lib/cn/cn";
import { formatMoney } from "@/shared/lib/format/money";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { NA, ratioText } from "../lib";

interface ConfusionMatrixCardProps {
	title: string;
	/** Что именно считается: подпишите, это разные матрицы с разным смыслом */
	subtitle: string;
	matrix: ConfusionMatrix | null | undefined;
	/** Событие в строках/столбцах: «разрыв» или «ниже буфера» */
	event?: string;
}

const Cell = ({ label, value, good, total }: { label: string; value: number; good: boolean; total: number }) => (
	<div
		className={cn(
			"flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-4 text-center",
			good ? "bg-success-soft text-success-soft-foreground" : "bg-warning-soft text-warning-soft-foreground"
		)}
	>
		<span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
		<span className="text-xs opacity-80">{label}</span>
		{total > 0 && <span className="text-xs tabular-nums opacity-60">{ratioText(value / total)}</span>}
	</div>
);

const NULL_HINT: Record<string, string> = {
	precision: "Модель не предсказала ни одного такого события",
	recall: "В периоде не было ни одного такого события",
	specificity: "В периоде не было дней без события",
	f1: "Не определён: нет точности или полноты",
	balancedAccuracy: "Не определена: нет событий или не-событий",
};

/**
 * Матрица ошибок 2×2: строки — факт, столбцы — прогноз. Рядом с accuracy всегда показываем базовую линию
 * «всегда отвечать как большинство» и долю событий: разрывов мало, и «никогда не предсказывать» уже даёт высокую accuracy.
 */
export const ConfusionMatrixCard = memo(
	({ title, subtitle, matrix: m, event = "разрыв" }: ConfusionMatrixCardProps) => {
		if (!m) return null;
		const metrics: { key: string; label: string; value: number | null; note?: string }[] = [
			{
				key: "accuracy",
				label: "Accuracy",
				value: m.accuracy,
				note:
					m.majorityBaselineAccuracy === null
						? undefined
						: `«всегда как большинство» даёт ${ratioText(m.majorityBaselineAccuracy)}`,
			},
			{ key: "precision", label: "Precision", value: m.precision },
			{ key: "recall", label: "Recall", value: m.recall },
			{ key: "f1", label: "F1", value: m.f1 },
			{ key: "specificity", label: "Specificity", value: m.specificity },
			{ key: "balancedAccuracy", label: "Balanced accuracy", value: m.balancedAccuracy },
		];
		return (
			<Card className="flex flex-col">
				<CardHeader className="flex-col items-start gap-0.5">
					<CardTitle className="w-full">{title}</CardTitle>
					<p className="text-xs text-muted-foreground">{subtitle}</p>
				</CardHeader>
				<div className="p-4 sm:p-6">
					<div
						className="grid grid-cols-[auto_1fr_1fr] items-stretch gap-2"
						role="table"
						aria-label={title}
					>
						<span />
						<span className="pb-1 text-center text-xs text-muted-foreground">Прогноз: {event}</span>
						<span className="pb-1 text-center text-xs text-muted-foreground">Прогноз: нет</span>
						<span className="flex rotate-180 items-center pr-1 text-xs text-muted-foreground [writing-mode:vertical-rl]">
							Факт: {event}
						</span>
						<Cell
							label="угадали"
							value={m.truePositive}
							good
							total={m.total}
						/>
						<Cell
							label="пропустили"
							value={m.falseNegative}
							good={false}
							total={m.total}
						/>
						<span className="flex rotate-180 items-center pr-1 text-xs text-muted-foreground [writing-mode:vertical-rl]">
							Факт: нет
						</span>
						<Cell
							label="ложная тревога"
							value={m.falsePositive}
							good={false}
							total={m.total}
						/>
						<Cell
							label="верно «нет»"
							value={m.trueNegative}
							good
							total={m.total}
						/>
					</div>
					<p className="mt-3 text-xs text-muted-foreground">
						Наблюдений: {m.total} · порог: ниже {formatMoney(m.threshold)}
						{m.prevalence !== null && ` · доля событий в факте: ${ratioText(m.prevalence)}`}
					</p>

					<dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
						{metrics.map((x) => (
							<div
								key={x.key}
								className="rounded-md bg-muted p-3"
								title={x.value === null ? NULL_HINT[x.key] : undefined}
							>
								<dt className="text-xs text-muted-foreground">{x.label}</dt>
								<dd
									className={cn(
										"font-display text-lg font-semibold tabular-nums",
										x.value === null && "text-muted-foreground"
									)}
								>
									{x.value === null ? NA : ratioText(x.value)}
								</dd>
								{x.value === null && NULL_HINT[x.key] && (
									<p className="mt-0.5 text-xs text-muted-foreground">{NULL_HINT[x.key]}</p>
								)}
								{x.note && <p className="mt-0.5 text-xs text-muted-foreground">{x.note}</p>}
							</div>
						))}
					</dl>
				</div>
			</Card>
		);
	}
);
