import { Upload } from "lucide-react";
import { memo, useState } from "react";
import { problemMessage } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Status } from "@/shared/ui/Status/Status";
import { toast } from "@/shared/ui/Toast/Toast";
import { CsvDrop } from "./CsvDrop";
import { useImportCompaniesCsvMutation, useImportOperationsCsvMutation } from "../api/bulkImportApi";
import { MAX_COMPANIES_BYTES, MAX_OPERATIONS_BYTES } from "../model/types";
import type { CompaniesImportRs, OperationsImportRs } from "../model/types";

type Kind = "companies" | "operations";

const List = ({ rows }: { rows: { key: string; left: string; right: React.ReactNode }[] }) => (
	<ul className="mt-3 flex max-h-56 flex-col gap-1 overflow-y-auto overscroll-contain">
		{rows.map((r) => (
			<li
				key={r.key}
				className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm"
			>
				<span className="min-w-0 truncate font-mono text-xs">{r.left}</span>
				<span className="shrink-0 text-xs">{r.right}</span>
			</li>
		))}
	</ul>
);

/** Загрузка файлов организаторов: сначала companies.csv, затем all_operations.csv на все компании. */
export const BulkImportDialog = memo(({ open, onClose }: { open: boolean; onClose: () => void }) => {
	const [kind, setKind] = useState<Kind>("companies");
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState("");
	const [companiesRs, setCompaniesRs] = useState<CompaniesImportRs | null>(null);
	const [operationsRs, setOperationsRs] = useState<OperationsImportRs | null>(null);
	const [importCompanies, companiesState] = useImportCompaniesCsvMutation();
	const [importOperations, operationsState] = useImportOperationsCsvMutation();
	const busy = companiesState.isLoading || operationsState.isLoading;

	const switchKind = (k: Kind) => {
		setKind(k);
		setFile(null);
		setError("");
	};

	const submit = async () => {
		if (!file || busy) return;
		setError("");
		if (kind === "companies") {
			const rs = await importCompanies(file);
			if ("error" in rs) return setError(problemMessage(rs.error));
			setCompaniesRs(rs.data);
			toast.success(`Компаний создано: ${rs.data.created}`);
		} else {
			const rs = await importOperations(file);
			if ("error" in rs) return setError(problemMessage(rs.error));
			setOperationsRs(rs.data);
			toast.success(`Операций добавлено: ${rs.data.inserted}`);
		}
		setFile(null);
	};

	return (
		<Dialog
			open={open}
			onClose={() => !busy && onClose()}
			title="Массовая загрузка из CSV"
			description="Файлы организаторов на все компании сразу. Импорт атомарный: при ошибке ничего не сохраняется."
			className="sm:max-w-xl"
			footer={
				<>
					<Button
						variant="ghost"
						onClick={onClose}
						disabled={busy}
					>
						Закрыть
					</Button>
					<Button
						variant="brand"
						onClick={submit}
						disabled={!file || busy}
					>
						<Upload />
						{busy ? "Загружаем…" : "Загрузить"}
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4">
				<Segmented
					value={kind}
					onChange={switchKind}
					label="Что загружаем"
					block
					options={[
						{ value: "companies", label: "1. Компании" },
						{ value: "operations", label: "2. Операции" },
					]}
				/>
				<p className="text-sm text-muted-foreground">
					{kind === "companies"
						? "Файл companies.csv. Сначала загрузите его: операции привязываются к уже созданным компаниям."
						: "Файл all_operations.csv со всеми операциями. Загрузка большого файла может занять время — не закрывайте окно."}
				</p>
				<CsvDrop
					key={kind}
					file={file}
					onFile={setFile}
					maxBytes={kind === "companies" ? MAX_COMPANIES_BYTES : MAX_OPERATIONS_BYTES}
					disabled={busy}
					label={kind === "companies" ? "Файл companies.csv" : "Файл all_operations.csv"}
				/>
				{error && (
					<p
						role="alert"
						className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
					>
						{error}
					</p>
				)}
				{kind === "companies" && companiesRs && (
					<div>
						<p className="text-sm">
							Всего в файле: <b>{companiesRs.total}</b> · создано: <b>{companiesRs.created}</b> · уже
							были: <b>{companiesRs.existing}</b>
						</p>
						<List
							rows={companiesRs.companies.map((c) => ({
								key: c.companyId,
								left: c.externalCompanyId,
								right: (
									<Status tone={c.status === "CREATED" ? "success" : "neutral"}>
										{c.status === "CREATED" ? "создана" : "уже была"}
									</Status>
								),
							}))}
						/>
					</div>
				)}
				{kind === "operations" && operationsRs && (
					<div>
						<p className="text-sm">
							Компаний: <b>{operationsRs.companies}</b> · добавлено операций:{" "}
							<b>{operationsRs.inserted}</b> · уже были: <b>{operationsRs.existing}</b>
						</p>
						<List
							rows={operationsRs.items.map((i) => ({
								key: i.accountId,
								left: i.externalCompanyId,
								right: (
									<span className="tabular-nums">
										+{i.inserted}
										{i.existing > 0 && (
											<span className="text-muted-foreground"> · {i.existing} были</span>
										)}
									</span>
								),
							}))}
						/>
					</div>
				)}
			</div>
		</Dialog>
	);
});
