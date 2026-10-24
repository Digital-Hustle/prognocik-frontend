import { CheckCircle2, CopyCheck, FileWarning, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import { IMPORT_STATUS_LABEL } from "@/entities/Import";
import type { StatementImport } from "@/entities/Import";
import { popIn, stagger } from "@/shared/config/motion";
import { formatDay } from "@/shared/lib/date/date";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber/AnimatedNumber";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { DrawnCheck } from "@/shared/ui/DrawnCheck/DrawnCheck";
import { Status } from "@/shared/ui/Status/Status";
import { ImportIssues } from "./ImportIssues";

interface ImportResultCardProps {
	companyId: string;
	result: StatementImport;
	actions?: React.ReactNode;
}

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

export const ImportResultCard = memo(({ companyId, result, actions }: ImportResultCardProps) => {
	const status = IMPORT_STATUS_LABEL[result.status] ?? { label: result.status, tone: "neutral" as const };
	const hasIssues = result.rejectedRows > 0 || result.warningCount > 0;
	const counters = [
		{ label: "Строк в файле", value: result.totalRows, icon: FileWarning, cls: "text-muted-foreground" },
		{ label: "Сохранено", value: result.acceptedRows, icon: CheckCircle2, cls: "text-success" },
		{ label: "Отклонено", value: result.rejectedRows, icon: XCircle, cls: "text-danger" },
		{ label: "Дубликаты", value: result.duplicateRows, icon: CopyCheck, cls: "text-info" },
	];

	return (
		<Card>
			<CardHeader>
				<div className="flex min-w-0 items-center gap-3">
					{result.status === "COMMITTED" && <DrawnCheck className="size-9 shrink-0" />}
					<CardTitle>{result.fileName ?? "Выписка загружена"}</CardTitle>
				</div>
				<Status tone={status.tone}>{status.label}</Status>
			</CardHeader>
			<div className="flex flex-col gap-5 p-4 sm:p-6">
				<motion.dl
					variants={stagger(0.05)}
					initial="hidden"
					animate="show"
					className="grid grid-cols-2 gap-3 sm:grid-cols-4"
				>
					{counters.map(({ label, value, icon: Icon, cls }) => (
						<motion.div
							key={label}
							variants={popIn}
							className="flex flex-col gap-1 rounded-md bg-muted p-3"
						>
							<dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Icon className={`size-3.5 ${cls}`} />
								{label}
							</dt>
							<dd className="font-display text-2xl font-semibold tabular-nums">
								<AnimatedNumber
									value={value}
									format={fmt}
								/>
							</dd>
						</motion.div>
					))}
				</motion.dl>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
					{result.fromDate && result.toDate && (
						<span>
							Период: <span className="text-foreground">{formatDay(result.fromDate)}</span> —{" "}
							<span className="text-foreground">{formatDay(result.toDate)}</span>
						</span>
					)}
					{result.warningCount > 0 && <span>Предупреждений: {result.warningCount}</span>}
					{result.dataVersion !== null && <span>Версия данных: {result.dataVersion}</span>}
				</div>
				{hasIssues && (
					<ImportIssues
						companyId={companyId}
						importId={result.id}
					/>
				)}
				{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
			</div>
		</Card>
	);
});
