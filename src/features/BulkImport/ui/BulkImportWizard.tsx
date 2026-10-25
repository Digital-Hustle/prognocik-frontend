import { ArrowRight, Building2, Check, ChevronRight, Search, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useState } from "react";
import { useListCompaniesQuery } from "@/entities/Company";
import { problemMessage } from "@/shared/api/problem";
import { fadeUp, spring } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";
import { Progress } from "@/shared/ui/Progress/Progress";
import { toast } from "@/shared/ui/Toast/Toast";
import { CsvDrop } from "./CsvDrop";
import { useImportCompaniesCsvMutation, useImportOperationsCsvMutation } from "../api/bulkImportApi";
import { MAX_COMPANIES_BYTES, MAX_OPERATIONS_BYTES } from "../model/types";
import type { CompaniesImportRs, OperationsImportRs } from "../model/types";

type Step = 1 | 2 | 3;

const STEPS: { n: Step; title: string }[] = [
	{ n: 1, title: "Организации" },
	{ n: 2, title: "Операции" },
	{ n: 3, title: "Готово" },
];

const VISIBLE = 60;

/** Таймер «идёт загрузка N с»: большой all_operations.csv грузится долго, прогресса у fetch нет */
function useElapsed(active: boolean) {
	const [sec, setSec] = useState(0);
	useEffect(() => {
		if (!active) return;
		setSec(0);
		const t = setInterval(() => setSec((s) => s + 1), 1000);
		return () => clearInterval(t);
	}, [active]);
	return sec;
}

const Summary = ({ items }: { items: { label: string; value: number; tone?: "brand" }[] }) => (
	<dl className="grid grid-cols-3 gap-2">
		{items.map((i) => (
			<div
				key={i.label}
				className="rounded-md bg-muted px-3 py-2.5"
			>
				<dt className="text-xs text-muted-foreground">{i.label}</dt>
				<dd className={cn("font-display text-xl font-semibold tabular-nums", i.tone && "text-brand")}>
					{i.value.toLocaleString("ru-RU")}
				</dd>
			</div>
		))}
	</dl>
);

interface Props {
	/** Открыть счёт загруженной организации */
	onOpenAccount: (companyId: string, accountId: string) => void;
	/** Перейти к обычному выбору организаций */
	onBrowse: () => void;
}

/**
 * Демо-показ: 1) companies.csv → 2) all_operations.csv → 3) выбор организации и счёта.
 * Оба импорта атомарные: при ошибке не сохраняется ничего, повтор безопасен. Полноту истории бэк подтверждает сам.
 */
export const BulkImportWizard = memo(({ onOpenAccount, onBrowse }: Props) => {
	const [step, setStep] = useState<Step>(1);
	const [companiesFile, setCompaniesFile] = useState<File | null>(null);
	const [operationsFile, setOperationsFile] = useState<File | null>(null);
	const [error, setError] = useState("");
	const [companiesRs, setCompaniesRs] = useState<CompaniesImportRs | null>(null);
	const [operationsRs, setOperationsRs] = useState<OperationsImportRs | null>(null);
	const [query, setQuery] = useState("");
	const [importCompanies, companiesState] = useImportCompaniesCsvMutation();
	const [importOperations, operationsState] = useImportOperationsCsvMutation();
	const companies = useListCompaniesQuery(undefined, { skip: step !== 3 });
	const busy = companiesState.isLoading || operationsState.isLoading;
	const elapsed = useElapsed(busy);

	const go = (s: Step) => {
		if (busy) return;
		setError("");
		setStep(s);
	};

	const uploadCompanies = async () => {
		if (!companiesFile || busy) return;
		setError("");
		const rs = await importCompanies(companiesFile);
		if ("error" in rs) return setError(problemMessage(rs.error));
		setCompaniesRs(rs.data);
		setCompaniesFile(null);
		toast.success(`Организаций: ${rs.data.total}, новых ${rs.data.created}`);
		setStep(2);
	};

	const uploadOperations = async () => {
		if (!operationsFile || busy) return;
		setError("");
		const rs = await importOperations(operationsFile);
		if ("error" in rs) return setError(problemMessage(rs.error));
		setOperationsRs(rs.data);
		setOperationsFile(null);
		toast.success(`Операций добавлено: ${rs.data.inserted.toLocaleString("ru-RU")}`);
		setStep(3);
	};

	const rows = useMemo(() => {
		const names = new Map(companies.data?.items.map((c) => [c.id, c]) ?? []);
		const q = query.trim().toLowerCase();
		return (operationsRs?.items ?? [])
			.map((i) => ({ ...i, company: names.get(i.companyId) }))
			.filter(
				(r) =>
					!q ||
					r.externalCompanyId.toLowerCase().includes(q) ||
					r.company?.name.toLowerCase().includes(q) ||
					r.company?.inn?.includes(q)
			);
	}, [operationsRs, companies.data, query]);

	return (
		<div className="flex flex-col gap-6">
			<ol className="grid grid-cols-3 gap-2">
				{STEPS.map((s) => {
					const done = (s.n === 1 && companiesRs) || (s.n === 2 && operationsRs);
					const on = s.n === step;
					return (
						<li key={s.n}>
							<button
								type="button"
								onClick={() => go(s.n)}
								disabled={busy}
								aria-current={on ? "step" : undefined}
								className={cn(
									"flex w-full flex-col gap-2 rounded-md p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
									!on && "hover:bg-surface-hover"
								)}
							>
								<motion.span
									layout
									transition={spring.snappy}
									className={cn("h-1.5 rounded-full", s.n <= step ? "bg-brand" : "bg-border-strong")}
								/>
								<span
									className={cn(
										"flex items-center gap-1.5 text-sm",
										on ? "font-semibold" : "text-muted-foreground"
									)}
								>
									{done ? <Check className="size-4 shrink-0 text-brand" /> : <span>{s.n}.</span>}
									<span className="truncate">{s.title}</span>
								</span>
							</button>
						</li>
					);
				})}
			</ol>

			<AnimatePresence
				mode="wait"
				initial={false}
			>
				<motion.div
					key={step}
					variants={fadeUp}
					initial="hidden"
					animate="show"
					exit="exit"
					className="flex flex-col gap-4"
				>
					{step === 1 && (
						<>
							<div>
								<h2 className="font-display text-xl font-semibold">Загрузите список организаций</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Файл companies.csv — до 2000 строк и 2 МБ. Каждая организация станет компанией, где
									вы владелец. Повторная загрузка того же файла ничего не задвоит.
								</p>
							</div>
							<CsvDrop
								file={companiesFile}
								onFile={setCompaniesFile}
								maxBytes={MAX_COMPANIES_BYTES}
								disabled={busy}
								label="Файл companies.csv"
							/>
							{companiesRs && (
								<Summary
									items={[
										{ label: "в файле", value: companiesRs.total },
										{ label: "создано", value: companiesRs.created, tone: "brand" },
										{ label: "уже были", value: companiesRs.existing },
									]}
								/>
							)}
						</>
					)}

					{step === 2 && (
						<>
							<div>
								<h2 className="font-display text-xl font-semibold">Загрузите все операции</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Файл all_operations.csv — до 100 МБ, 300 000 операций и 500 организаций. Для каждой
									организации создастся рублёвый счёт, история сразу считается полной — прогноз можно
									строить без дополнительных подтверждений.
								</p>
							</div>
							{!companiesRs && (
								<p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
									Операции привязываются к уже загруженным организациям. Если companies.csv ещё не
									загружен — начните с шага 1.
								</p>
							)}
							<CsvDrop
								file={operationsFile}
								onFile={setOperationsFile}
								maxBytes={MAX_OPERATIONS_BYTES}
								disabled={busy}
								label="Файл all_operations.csv"
							/>
							{operationsRs && (
								<Summary
									items={[
										{ label: "организаций", value: operationsRs.companies },
										{ label: "добавлено", value: operationsRs.inserted, tone: "brand" },
										{ label: "уже были", value: operationsRs.existing },
									]}
								/>
							)}
						</>
					)}

					{step === 3 && (
						<>
							<div>
								<h2 className="font-display text-xl font-semibold">Данные загружены</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									{operationsRs
										? "Выберите организацию — откроется её счёт: операции, прогноз, оценка качества."
										: "Операции в этот раз не загружались. Откройте список организаций."}
								</p>
							</div>
							{operationsRs && operationsRs.items.length > 0 && (
								<>
									<Input
										icon={<Search />}
										placeholder="Название, ИНН или код организации"
										value={query}
										onChange={(e) => setQuery(e.target.value)}
										aria-label="Поиск организации"
									/>
									<ul className="flex max-h-sheet flex-col gap-1.5 overflow-y-auto overscroll-contain">
										{rows.slice(0, VISIBLE).map((r) => (
											<li key={r.accountId}>
												<button
													type="button"
													onClick={() => onOpenAccount(r.companyId, r.accountId)}
													className="flex w-full items-center gap-3 rounded-md bg-muted px-3 py-2.5 text-left outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
												>
													<Building2 className="size-4 shrink-0 text-muted-foreground" />
													<span className="min-w-0 flex-1">
														<span className="block truncate text-sm font-medium">
															{r.company?.name ?? r.externalCompanyId}
														</span>
														<span className="block truncate text-xs text-muted-foreground">
															{r.externalCompanyId}
															{r.company?.inn ? ` · ИНН ${r.company.inn}` : ""} · операций{" "}
															{(r.inserted + r.existing).toLocaleString("ru-RU")}
														</span>
													</span>
													<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
												</button>
											</li>
										))}
									</ul>
									{rows.length > VISIBLE && (
										<p className="text-xs text-muted-foreground">
											Показаны первые {VISIBLE} из {rows.length} — уточните поиск.
										</p>
									)}
									{rows.length === 0 && (
										<p className="text-sm text-muted-foreground">Ничего не нашлось.</p>
									)}
								</>
							)}
						</>
					)}

					{busy && (
						<div
							role="status"
							className="flex flex-col gap-2"
						>
							<Progress
								value={Math.min(0.9, 0.08 + elapsed / 120)}
								tone="brand"
							/>
							<span className="text-xs text-muted-foreground">
								Загружаем и проверяем файл · {elapsed} с. Не закрывайте вкладку: импорт атомарный, при
								обрыве ничего не сохранится.
							</span>
						</div>
					)}

					{error && (
						<p
							role="alert"
							className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
						>
							{error}
						</p>
					)}

					<div className="flex flex-wrap gap-2">
						{step === 1 && (
							<>
								<Button
									variant="brand"
									size="lg"
									onClick={uploadCompanies}
									disabled={!companiesFile || busy}
								>
									<Upload />
									{busy ? "Загружаем…" : "Загрузить организации"}
								</Button>
								<Button
									variant="ghost"
									size="lg"
									onClick={() => go(2)}
									disabled={busy}
								>
									{companiesRs ? "Дальше" : "Уже загружены"}
									<ArrowRight />
								</Button>
							</>
						)}
						{step === 2 && (
							<>
								<Button
									variant="brand"
									size="lg"
									onClick={uploadOperations}
									disabled={!operationsFile || busy}
								>
									<Upload />
									{busy ? "Загружаем…" : "Загрузить операции"}
								</Button>
								<Button
									variant="ghost"
									size="lg"
									onClick={() => go(3)}
									disabled={busy}
								>
									{operationsRs ? "Дальше" : "Пропустить"}
									<ArrowRight />
								</Button>
							</>
						)}
						{step === 3 && (
							<Button
								variant={operationsRs ? "outline" : "brand"}
								size="lg"
								onClick={onBrowse}
							>
								Все организации
								<ArrowRight />
							</Button>
						)}
					</div>
				</motion.div>
			</AnimatePresence>
		</div>
	);
});
