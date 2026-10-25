import { ArrowRight, FileSpreadsheet, History } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { dataAsOfDate, useGetCompanyQuery } from "@/entities/Company";
import { IMPORT_STATUS_LABEL, useGetImportQuery, useListImportsQuery } from "@/entities/Import";
import type { StatementImport } from "@/entities/Import";
import { useWorkspace } from "@/entities/Workspace";
import { DetectRecurringButton } from "@/features/DetectRecurring";
import { UploadStatementForm } from "@/features/UploadStatement";
import { fadeUp, stagger, tween } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { cn } from "@/shared/lib/cn/cn";
import { formatDayShort, formatInstant } from "@/shared/lib/date/date";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";
import { ImportIssues, ImportResultCard } from "@/widgets/ImportReport";

const ImportPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const canImport = company.data?.permissions.canImport ?? false;
	const imports = useListImportsQuery({ companyId, accountId });
	const [result, setResult] = useState<StatementImport | null>(null);
	const [rejectedId, setRejectedId] = useState<string | null>(null);
	const [opened, setOpened] = useState<StatementImport | null>(null);
	const rejected = useGetImportQuery({ companyId, importId: rejectedId ?? "" }, { skip: !rejectedId });

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker="Шаг 1 · история операций"
				title="Банковские выписки"
				sub="CSV с датой, суммой и направлением, контрагентом и ИНН, назначением платежа и остатком на конец дня. Операции сразу разложим по категориям."
			/>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
				<motion.div
					variants={fadeUp}
					initial="hidden"
					animate="show"
					className="min-w-0 lg:col-span-3"
				>
					<Card className="p-4 sm:p-6">
						{!canImport && company.data && (
							<div className="mb-4 rounded-md bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
								У роли «Наблюдатель» нет права загружать выписки.
							</div>
						)}
						<UploadStatementForm
							companyId={companyId}
							accountId={accountId}
							disabled={!canImport}
							onUploaded={(r) => {
								setRejectedId(null);
								setResult(r);
							}}
							onRejected={setRejectedId}
						/>
					</Card>
				</motion.div>

				<motion.div
					variants={fadeUp}
					initial="hidden"
					animate="show"
					className="min-w-0 lg:col-span-2"
				>
					<Card className="flex h-full flex-col">
						<CardHeader>
							<CardTitle>История загрузок</CardTitle>
							<History className="size-5 text-muted-foreground" />
						</CardHeader>
						{imports.isLoading ? (
							<div className="flex flex-col gap-2 p-4">
								<Skeleton className="h-14" />
								<Skeleton className="h-14" />
							</div>
						) : imports.error ? (
							<ErrorState
								error={imports.error}
								onRetry={imports.refetch}
							/>
						) : (imports.data?.items ?? []).length === 0 ? (
							<EmptyState
								icon={<FileSpreadsheet />}
								title="Пока пусто"
								text="Загрузите первую выписку — история появится здесь."
							/>
						) : (
							<motion.ul
								variants={stagger(0.04)}
								initial="hidden"
								animate="show"
								className="flex flex-col p-2 sm:p-3"
							>
								{imports.data?.items.map((imp) => {
									const st = IMPORT_STATUS_LABEL[imp.status] ?? {
										label: imp.status,
										tone: "neutral" as const,
									};
									return (
										<motion.li
											key={imp.id}
											variants={fadeUp}
										>
											<button
												type="button"
												onClick={() => setOpened(imp)}
												className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted"
											>
												<FileSpreadsheet className="size-5 shrink-0 text-brand" />
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-medium">
														{imp.fileName ?? "Выписка"}
													</span>
													<span className="block text-xs text-muted-foreground">
														{formatInstant(imp.createdAt)}
														{imp.fromDate && imp.toDate
															? ` · ${formatDayShort(imp.fromDate)}–${formatDayShort(imp.toDate)}`
															: ""}{" "}
														· {imp.acceptedRows}/{imp.totalRows} строк
													</span>
												</span>
												<Status tone={st.tone}>{st.label}</Status>
											</button>
										</motion.li>
									);
								})}
							</motion.ul>
						)}
					</Card>
				</motion.div>
			</div>

			<AnimatePresence>
				{result && (
					<motion.div
						key={result.id}
						variants={fadeUp}
						initial="hidden"
						animate="show"
						exit={{ opacity: 0, transition: tween.exit }}
					>
						<ImportResultCard
							companyId={companyId}
							result={result}
							actions={
								<>
									<DetectRecurringButton
										companyId={companyId}
										accountId={accountId}
										disabled={!canImport}
										asOfDate={dataAsOfDate({ latestBalanceDate: result.toDate })}
									/>
									<Link to={RoutePath.forecast}>
										<Button variant="outline">
											К прогнозу
											<ArrowRight />
										</Button>
									</Link>
								</>
							}
						/>
					</motion.div>
				)}
				{rejectedId && rejected.data && (
					<motion.div
						key={`rej-${rejectedId}`}
						variants={fadeUp}
						initial="hidden"
						animate="show"
						exit={{ opacity: 0, transition: tween.exit }}
					>
						<ImportResultCard
							companyId={companyId}
							result={rejected.data}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			<Dialog
				open={Boolean(opened)}
				onClose={() => setOpened(null)}
				title={opened?.fileName ?? "Выписка"}
				description={opened ? `Загружена ${formatInstant(opened.createdAt)}` : undefined}
				className="sm:max-w-2xl"
			>
				{opened && (
					<div className="flex flex-col gap-4">
						<div className={cn("grid grid-cols-2 gap-2 text-sm sm:grid-cols-4")}>
							{[
								["Строк", opened.totalRows],
								["Сохранено", opened.acceptedRows],
								["Отклонено", opened.rejectedRows],
								["Дубликатов", opened.duplicateRows],
							].map(([l, v]) => (
								<div
									key={l}
									className="rounded-md bg-muted p-3"
								>
									<div className="text-xs text-muted-foreground">{l}</div>
									<div className="font-display text-lg font-semibold tabular-nums">{v}</div>
								</div>
							))}
						</div>
						<ImportIssues
							companyId={companyId}
							importId={opened.id}
						/>
					</div>
				)}
			</Dialog>
		</div>
	);
};

export default ImportPage;
