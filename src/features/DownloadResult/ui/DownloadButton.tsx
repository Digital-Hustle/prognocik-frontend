import { Download, FileText, Sheet } from "lucide-react";
import { useState } from "react";
import { downloadFile } from "@/shared/api/download";
import { problemMessage } from "@/shared/api/problem";
import { accountUrl } from "@/shared/api/rtkApi";
import { Button } from "@/shared/ui/Button/Button";
import { Spinner } from "@/shared/ui/Spinner/Spinner";
import { toast } from "@/shared/ui/Toast/Toast";

export type ResultFile = "forecast-trace" | "forecast-csv" | "backtest-report" | "backtest-trace" | "backtest-csv";

/** Путь на Gateway и запасное имя файла; настоящее имя приходит в Content-Disposition */
const FILES: Record<ResultFile, { path: (id: string) => string; fallback: (id: string) => string; label: string }> = {
	"forecast-trace": {
		path: (id) => `/forecasts/${id}/trace`,
		fallback: (id) => `forecast-${id}-trace.txt`,
		label: "Лог (.txt)",
	},
	"forecast-csv": {
		path: (id) => `/forecasts/${id}/export`,
		fallback: (id) => `forecast-${id}.csv`,
		label: "CSV",
	},
	"backtest-report": {
		path: (id) => `/backtests/${id}/report`,
		fallback: (id) => `backtest-${id}-report.md`,
		label: "Отчёт (Markdown)",
	},
	"backtest-trace": {
		path: (id) => `/backtests/${id}/trace`,
		fallback: (id) => `backtest-${id}-trace.txt`,
		label: "Лог (.txt)",
	},
	"backtest-csv": {
		path: (id) => `/backtests/${id}/export`,
		fallback: (id) => `backtest-${id}.csv`,
		label: "CSV прогноз/факт",
	},
};

interface DownloadButtonProps {
	companyId: string;
	accountId: string;
	/** id прогноза или бэктеста */
	resultId: string;
	file: ResultFile;
	label?: string;
	disabled?: boolean;
}

/** Скачивание файла результата (лог, CSV, отчёт). GET с cookie, CSRF не нужен. */
export const DownloadButton = ({ companyId, accountId, resultId, file, label, disabled }: DownloadButtonProps) => {
	const [busy, setBusy] = useState(false);
	const spec = FILES[file];
	const Icon = file.endsWith("csv") ? Sheet : FileText;

	const onClick = async () => {
		setBusy(true);
		try {
			const name = await downloadFile(
				accountUrl(companyId, accountId, spec.path(resultId)),
				spec.fallback(resultId)
			);
			toast.success(`Файл «${name}» скачан`);
		} catch (e) {
			toast.error(problemMessage(e, "Не удалось скачать файл"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button
			size="sm"
			variant="outline"
			disabled={disabled || busy}
			onClick={onClick}
		>
			{busy ? <Spinner className="size-4" /> : <Icon />}
			{label ?? spec.label}
			{!busy && <Download className="opacity-50" />}
		</Button>
	);
};
