import { memo } from "react";
import { ONEC_ACTION, oneCReason } from "@/entities/OneC";
import type { OneCSyncReport } from "@/entities/OneC";
import { cn } from "@/shared/lib/cn/cn";
import { formatDay } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { Status } from "@/shared/ui/Status/Status";

const COUNTERS = [
	{ key: "created", label: "создано", tone: "success" },
	{ key: "updated", label: "сдвинуто", tone: "info" },
	{ key: "unchanged", label: "без изменений", tone: "neutral" },
	{ key: "skipped", label: "пропущено", tone: "neutral" },
] as const;

export const OneCSyncResult = memo(({ report }: { report: OneCSyncReport }) => (
	<div className="flex flex-col gap-4">
		<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
			<Status tone={report.dryRun ? "warning" : "success"}>{report.dryRun ? "Предпросмотр" : "Применено"}</Status>
			{report.demo && <Status tone="info">демо-данные 1С</Status>}
			<span>окно с {formatDay(report.from)}</span>
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
		<ul className="flex flex-col divide-y divide-border rounded-md border border-border">
			{report.items.map((i) => {
				const a = ONEC_ACTION[i.action];
				const out = i.direction === "OUT";
				return (
					<li
						key={i.externalId}
						className="flex flex-col gap-1.5 px-3 py-3 sm:flex-row sm:items-center sm:gap-4"
					>
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<Status tone={a.tone}>{a.label}</Status>
								<span className="text-sm font-medium">{i.title}</span>
							</div>
							<div className="text-xs text-muted-foreground">
								{i.documentNumber ? `${i.documentNumber} · ` : ""}срок {formatDay(i.dueDate)}
								{i.reason ? ` · ${oneCReason(i.reason)}` : ""}
							</div>
						</div>
						<div
							className={cn(
								"shrink-0 font-display text-sm font-semibold tabular-nums sm:text-right",
								out ? "text-danger" : "text-success"
							)}
						>
							{out ? "−" : "+"}
							{formatMoney(i.amount)}
						</div>
					</li>
				);
			})}
		</ul>
	</div>
));
