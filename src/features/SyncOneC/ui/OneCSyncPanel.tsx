import { Download, Eye } from "lucide-react";
import { memo, useState } from "react";
import type { OneCSyncReport } from "@/entities/OneC";
import { problemMessage } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { DatePicker } from "@/shared/ui/DatePicker/DatePicker";
import { Field } from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast/Toast";
import { useSyncOneCMutation } from "../api/syncOneCApi";

interface Props {
	companyId: string;
	accountId: string;
	/** Начало окна по умолчанию: день после последних данных счёта — тогда планы попадут в прогноз */
	defaultFrom: string;
	canSync: boolean;
	onReport: (report: OneCSyncReport) => void;
}

type Run = "preview" | "sync";

/** «Загрузить из 1С»: окно начинается с даты, от которой строится прогноз. */
export const OneCSyncPanel = memo(({ companyId, accountId, defaultFrom, canSync, onReport }: Props) => {
	const [sync, state] = useSyncOneCMutation();
	const [from, setFrom] = useState(defaultFrom);
	const [running, setRunning] = useState<Run | null>(null);
	const [error, setError] = useState<string | null>(null);

	const run = async (kind: Run) => {
		setError(null);
		if (!from) return setError("Выберите дату начала окна.");
		setRunning(kind);
		const rs = await sync({ companyId, accountId, body: { fromDate: from, dryRun: kind === "preview" } });
		setRunning(null);
		if ("error" in rs) return setError(problemMessage(rs.error));
		onReport(rs.data);
		toast.success(
			kind === "preview"
				? "Предпросмотр готов: данные не менялись"
				: rs.data.dataChanged
					? "Документы из 1С загружены. Прогноз нужно пересчитать"
					: "Загрузка завершена: изменений нет"
		);
	};

	return (
		<form
			className="flex flex-col gap-5"
			onSubmit={(e) => {
				e.preventDefault();
				void run("sync");
			}}
		>
			<Field
				label="Окно начинается с"
				hint="По умолчанию — день после последних данных по счёту: прогноз учитывает планы в 30 днях после своей даты. Сроки документов считаются от этой даты."
			>
				<DatePicker
					value={from}
					onChange={setFrom}
				/>
			</Field>

			{error && (
				<p
					role="alert"
					className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
				>
					{error}
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="outline"
					disabled={!canSync || state.isLoading}
					onClick={() => void run("preview")}
				>
					<Eye />
					{running === "preview" ? "Смотрим…" : "Предпросмотр"}
				</Button>
				<Button
					type="submit"
					variant="brand"
					disabled={!canSync || state.isLoading}
				>
					<Download />
					{running === "sync" ? "Загружаем…" : "Загрузить из 1С"}
				</Button>
			</div>
			{!canSync && (
				<p className="text-xs text-muted-foreground">
					Загружать могут владелец и бухгалтер компании. У вас доступ только для чтения.
				</p>
			)}
		</form>
	);
});
