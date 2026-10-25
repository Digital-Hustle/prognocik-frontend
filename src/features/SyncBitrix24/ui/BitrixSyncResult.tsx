import { memo, useMemo, useState } from "react";
import { BITRIX_ACTION, BITRIX_KIND_LABEL, bitrixReason } from "@/entities/Bitrix24";
import type { BitrixSyncReport } from "@/entities/Bitrix24";
import { formatDay } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Status } from "@/shared/ui/Status/Status";

type Filter = "all" | "changes";

const COUNTERS = [
	{ key: "created", label: "создано", tone: "success" },
	{ key: "reopened", label: "возобновлено", tone: "success" },
	{ key: "updated", label: "обновлено", tone: "info" },
	{ key: "cancelled", label: "аннулировано", tone: "danger" },
	{ key: "unchanged", label: "без изменений", tone: "neutral" },
	{ key: "skipped", label: "пропущено", tone: "neutral" },
] as const;

/** Итог синхронизации: счётчики и построчная таблица с цветом по действию. */
export const BitrixSyncResult = memo(({ report }: { report: BitrixSyncReport }) => {
	const [filter, setFilter] = useState<Filter>("changes");
	const items = useMemo(
		() =>
			report.items.filter(
				(i) => filter === "all" || (i.action !== "UNCHANGED" && i.action !== "SKIPPED") || i.reason !== null
			),
		[report.items, filter]
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
				<Status tone={report.dryRun ? "warning" : report.mode === "DEMO" ? "info" : "success"}>
					{report.dryRun ? "Предпросмотр" : report.mode === "DEMO" ? "Демо-данные" : "Применено"}
				</Status>
				<span>
					{report.portal ? `${report.portal} · ` : ""}
					{formatDay(report.from)} — {formatDay(report.to)} · получено {report.fetched}
				</span>
			</div>
			<ul className="flex flex-wrap gap-2">
				{COUNTERS.map((c) => (
					<li key={c.key}>
						<Status tone={report[c.key] > 0 ? c.tone : "neutral"}>
							{report[c.key]} {c.label}
						</Status>
					</li>
				))}
			</ul>

			<Segmented
				size="sm"
				value={filter}
				onChange={setFilter}
				label="Какие строки показывать"
				options={[
					{ value: "changes", label: "Изменения" },
					{ value: "all", label: `Все (${report.items.length})` },
				]}
			/>

			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground">Нет строк для показа.</p>
			) : (
				<ul className="flex flex-col divide-y divide-border rounded-md border border-border">
					{items.map((i) => {
						const a = BITRIX_ACTION[i.action];
						const weighted = i.planAmount && i.documentAmount && i.planAmount !== i.documentAmount;
						return (
							<li
								key={`${i.kind}:${i.externalId}`}
								className="flex flex-col gap-1.5 px-3 py-3 sm:flex-row sm:items-center sm:gap-4"
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<Status tone={a.tone}>{a.label}</Status>
										<span className="truncate text-sm font-medium">{i.title}</span>
									</div>
									<div className="text-xs text-muted-foreground">
										{BITRIX_KIND_LABEL[i.kind]} № {i.externalId}
										{i.dueDate ? ` · срок ${formatDay(i.dueDate)}` : ""}
										{i.probability !== null ? ` · вероятность ${i.probability}%` : ""}
										{i.reason ? ` · ${bitrixReason(i.reason)}` : ""}
									</div>
								</div>
								<div className="shrink-0 text-right font-display text-sm font-semibold tabular-nums">
									{i.planAmount ? `+${formatMoney(i.planAmount)}` : "—"}
									{weighted && (
										<div className="text-xs font-normal text-muted-foreground">
											из {formatMoney(i.documentAmount)}
										</div>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
});
