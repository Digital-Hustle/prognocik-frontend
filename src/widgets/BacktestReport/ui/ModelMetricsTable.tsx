import { memo } from "react";
import type { ModelScore, QualityMetrics } from "@/entities/Backtest";
import { cn } from "@/shared/lib/cn/cn";
import { formatMoney, toNumber } from "@/shared/lib/format/money";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Status } from "@/shared/ui/Status/Status";
import { NA, ratioText } from "../lib";

const rub2 = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
/** MSE — в рублях в квадрате */
const mse = (v: string | null | undefined) => {
	const n = toNumber(v);
	return n === null ? NA : `${rub2.format(n)} ₽²`;
};

const Th = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
	<th
		className="px-3 py-2 text-right font-medium whitespace-nowrap first:text-left"
		title={hint}
	>
		{children}
	</th>
);

/** Таблица ошибок: выбранная модель и эталоны на одних и тех же днях. Лучшая по MAE подсвечена. */
export const ModelMetricsTable = memo(({ quality }: { quality: QualityMetrics }) => {
	const rows: { score: ModelScore; primary: boolean }[] = [
		{ score: quality.primary, primary: true },
		...quality.benchmarks.map((score) => ({ score, primary: false })),
	];
	const best = Math.min(...rows.map((r) => toNumber(r.score.maeBalance) ?? Infinity));
	return (
		<Card>
			<CardHeader className="flex-col items-start gap-0.5">
				<CardTitle className="w-full">Ошибки модели и эталонов</CardTitle>
				<p className="text-xs text-muted-foreground">
					Все модели оценены на одних и тех же днях. MAE и RMSE — в рублях, MSE — в рублях в квадрате.
				</p>
			</CardHeader>
			<div className="relative overflow-x-auto p-2 sm:p-3">
				<table className="w-full min-w-[720px] text-sm">
					<thead>
						<tr className="text-xs text-muted-foreground">
							<Th>Модель</Th>
							<Th hint="Средняя абсолютная ошибка остатка">MAE</Th>
							<Th hint="Средний квадрат ошибки, ₽²">MSE</Th>
							<Th hint="Корень из MSE, ₽ — сильнее штрафует крупные промахи">RMSE</Th>
							<Th hint="Сумма |ошибок| / сумма |факта|">WAPE</Th>
							<Th hint="1 − MAE/MAE(наивной). Больше 0 — лучше наивной модели">Лучше наивной</Th>
							<Th>MAE притока</Th>
							<Th>MAE оттока</Th>
							<Th>Дней</Th>
						</tr>
					</thead>
					<tbody>
						{rows.map(({ score: s, primary }) => {
							const isBest = (toNumber(s.maeBalance) ?? Infinity) === best;
							return (
								<tr
									key={s.model}
									className={cn("border-t border-border", primary && "bg-accent/40")}
								>
									<td className="px-3 py-2.5">
										<div className="flex flex-wrap items-center gap-1.5 font-medium">
											{s.model}
											{primary && <Status tone="success">выбрана</Status>}
											{isBest && !primary && <Status tone="lime">точнее выбранной</Status>}
										</div>
										<div className="text-xs text-muted-foreground">{s.description}</div>
									</td>
									<td className="px-3 py-2.5 text-right font-medium tabular-nums">
										{formatMoney(s.maeBalance)}
									</td>
									<td className="px-3 py-2.5 text-right tabular-nums">{mse(s.mseBalance)}</td>
									<td className="px-3 py-2.5 text-right tabular-nums">
										{formatMoney(s.rmseBalance)}
									</td>
									<td className="px-3 py-2.5 text-right tabular-nums">{ratioText(s.wapeBalance)}</td>
									<td
										className="px-3 py-2.5 text-right tabular-nums"
										title={
											s.skillScoreVsNaive === null
												? "Нет наивной модели для сравнения"
												: undefined
										}
									>
										{ratioText(s.skillScoreVsNaive)}
									</td>
									<td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(s.inflowMae)}</td>
									<td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(s.outflowMae)}</td>
									<td className="px-3 py-2.5 text-right tabular-nums">{s.evaluatedDays}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</Card>
	);
});
