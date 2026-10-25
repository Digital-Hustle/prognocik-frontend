import { memo } from "react";
import type { ModelSelection } from "@/entities/Backtest";
import { formatDay } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Status } from "@/shared/ui/Status/Status";

/** Выбор модели на отсечках, которые не участвовали в выборе (отложенная треть) — честная оценка. */
export const ModelSelectionCard = memo(({ selection: s }: { selection: ModelSelection }) => (
	<Card>
		<CardHeader className="flex-col items-start gap-0.5">
			<CardTitle className="w-full">Выбор модели</CardTitle>
			<p className="text-xs text-muted-foreground">
				Модель выбрана по {s.selectionOrigins} отсечкам и проверена на {s.holdoutOrigins} последних (с{" "}
				{formatDay(s.holdoutFrom)}), которые в выборе не участвовали.
			</p>
		</CardHeader>
		<div className="grid grid-cols-1 gap-3 p-4 sm:p-6 lg:grid-cols-[1fr_2fr]">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
				<div className="rounded-md bg-muted p-3">
					<div className="text-xs text-muted-foreground">Ошибка выбранной ({s.selectedModel})</div>
					<div className="font-display text-lg font-semibold tabular-nums">
						{formatMoney(s.selectedHoldoutMae)}
					</div>
				</div>
				<div className="rounded-md bg-muted p-3">
					<div className="text-xs text-muted-foreground">Ошибка модели из настроек</div>
					<div className="font-display text-lg font-semibold tabular-nums">
						{formatMoney(s.primaryHoldoutMae)}
					</div>
				</div>
			</div>
			<div className="relative overflow-x-auto">
				<table className="w-full min-w-[360px] text-sm">
					<thead>
						<tr className="text-left text-xs text-muted-foreground">
							<th className="px-3 py-2 font-medium">Кандидат</th>
							<th className="px-3 py-2 text-right font-medium">MAE при выборе</th>
							<th className="px-3 py-2 text-right font-medium">MAE на отложенных</th>
						</tr>
					</thead>
					<tbody>
						{s.candidates.map((c) => (
							<tr
								key={c.model}
								className="border-t border-border"
							>
								<td className="px-3 py-2">
									{c.model}
									{c.model === s.selectedModel && (
										<span className="ml-2">
											<Status tone="success">выбрана</Status>
										</span>
									)}
								</td>
								<td className="px-3 py-2 text-right tabular-nums">{formatMoney(c.selectionMae)}</td>
								<td className="px-3 py-2 text-right tabular-nums">{formatMoney(c.holdoutMae)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	</Card>
));
