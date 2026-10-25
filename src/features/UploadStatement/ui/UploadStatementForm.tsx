import { FileSpreadsheet, FileUp, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import type { StatementImport, ValidationMode } from "@/entities/Import";
import { problemMessage, toProblem } from "@/shared/api/problem";
import { fadeUp, popIn, spring, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { Progress } from "@/shared/ui/Progress/Progress";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Switch } from "@/shared/ui/Switch/Switch";
import { toast } from "@/shared/ui/Toast/Toast";
import { useUploadStatementMutation } from "../api/uploadApi";

interface UploadStatementFormProps {
	companyId: string;
	accountId: string;
	disabled?: boolean;
	onUploaded: (result: StatementImport) => void;
	/** 422 с resourceId — отчёт отклонённого импорта доступен в Orchestrator */
	onRejected?: (importId: string) => void;
}

const sizeLabel = (bytes: number) =>
	bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;

export const UploadStatementForm = memo(
	({ companyId, accountId, disabled, onUploaded, onRejected }: UploadStatementFormProps) => {
		const [upload, state] = useUploadStatementMutation();
		const idem = useIdempotencyKey();
		const input = useRef<HTMLInputElement>(null);
		const [file, setFile] = useState<File | null>(null);
		const [drag, setDrag] = useState(false);
		const [mode, setMode] = useState<ValidationMode>("SKIP_INVALID");
		const [complete, setComplete] = useState(true);

		const pick = useCallback((f: File | undefined | null) => {
			if (!f) return;
			if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
				toast.error("Нужен CSV-файл выписки");
				return;
			}
			setFile(f);
		}, []);

		const onDrop = (e: DragEvent) => {
			e.preventDefault();
			setDrag(false);
			pick(e.dataTransfer.files?.[0]);
		};

		const onSubmit = async (e: FormEvent) => {
			e.preventDefault();
			if (!file) return;
			const fingerprint = {
				name: file.name,
				size: file.size,
				modified: file.lastModified,
				mode,
				complete,
			};
			const rs = await upload({
				companyId,
				accountId,
				file,
				validationMode: mode,
				// По умолчанию сервер сам подтверждает период от первой до последней операции файла
				completeness: complete ? undefined : "UNKNOWN",
				idempotencyKey: idem.get(fingerprint),
			});
			if ("data" in rs && rs.data) {
				idem.done();
				setFile(null);
				onUploaded(rs.data);
			} else {
				const p = toProblem(rs.error);
				toast.error(problemMessage(rs.error, "Выписку не удалось загрузить"));
				if (p.resourceId) onRejected?.(p.resourceId);
			}
		};

		return (
			<form
				onSubmit={onSubmit}
				className="flex flex-col gap-5"
			>
				<motion.label
					onDragOver={(e) => {
						e.preventDefault();
						setDrag(true);
					}}
					onDragLeave={() => setDrag(false)}
					onDrop={onDrop}
					animate={{ scale: drag ? 1.015 : 1 }}
					transition={spring.snappy}
					className={cn(
						"relative flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
						drag ? "border-brand bg-accent" : "border-border-strong bg-muted hover:bg-surface",
						disabled && "pointer-events-none opacity-60"
					)}
				>
					<input
						ref={input}
						type="file"
						accept=".csv,text/csv"
						className="sr-only"
						disabled={disabled}
						onChange={(e) => {
							pick(e.target.files?.[0]);
							e.target.value = "";
						}}
					/>
					<AnimatePresence
						mode="wait"
						initial={false}
					>
						{file ? (
							<motion.div
								key="file"
								variants={popIn}
								initial="hidden"
								animate="show"
								exit="exit"
								className="flex flex-col items-center gap-3"
							>
								<span className="flex size-14 items-center justify-center rounded-md bg-hero text-lime shadow-float">
									<FileSpreadsheet className="size-7" />
								</span>
								<div>
									<div className="font-medium">{file.name}</div>
									<div className="text-xs text-muted-foreground">{sizeLabel(file.size)}</div>
								</div>
								<Button
									size="sm"
									variant="quiet"
									onClick={(e) => {
										e.preventDefault();
										setFile(null);
									}}
								>
									<X />
									Убрать
								</Button>
							</motion.div>
						) : (
							<motion.div
								key="empty"
								variants={fadeUp}
								initial="hidden"
								animate="show"
								exit="exit"
								className="flex flex-col items-center gap-3"
							>
								<motion.span
									animate={drag ? { y: -6 } : { y: 0 }}
									transition={spring.pop}
									className="flex size-14 items-center justify-center rounded-md bg-card text-brand shadow-card"
								>
									<FileUp className="size-7" />
								</motion.span>
								<div>
									<div className="font-display text-lg font-semibold tracking-display">
										Перетащите выписку сюда
									</div>
									<div className="text-sm text-muted-foreground">
										или нажмите, чтобы выбрать CSV-файл из банка
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.label>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<span className="text-sm font-medium">Если в файле есть ошибочные строки</span>
						<Segmented
							block
							value={mode}
							onChange={setMode}
							label="Режим проверки"
							options={[
								{ value: "SKIP_INVALID", label: "Пропустить их" },
								{ value: "ATOMIC", label: "Отклонить файл" },
							]}
						/>
						<p className="text-xs text-muted-foreground">
							{mode === "SKIP_INVALID"
								? "Корректные операции сохранятся, ошибки покажем отчётом."
								: "Файл сохранится, только если в нём нет ни одной ошибки."}
						</p>
					</div>
					<div className="flex flex-col gap-2">
						<label className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
							<span className="min-w-0 flex-1">
								<span className="block text-sm font-medium">Считать выписку полной</span>
								<span className="block text-xs text-muted-foreground">
									Дни без операций между первой и последней датой файла — не пропуски, а дни с нулём
								</span>
							</span>
							<Switch
								checked={complete}
								onChange={setComplete}
								label="Полная выписка"
							/>
						</label>
					</div>
				</div>

				<AnimatePresence>
					{state.isLoading && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0, transition: tween.exit }}
							transition={spring.glide}
							className="flex flex-col gap-2"
						>
							<Progress value={0.6} />
							<span className="text-xs text-muted-foreground">
								Разбираем операции, категоризируем и сохраняем…
							</span>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="flex flex-wrap justify-end gap-2">
					{state.isError && file && (
						<Button
							variant="outline"
							type="submit"
						>
							<RotateCcw />
							Повторить
						</Button>
					)}
					<Button
						type="submit"
						size="lg"
						variant="brand"
						disabled={!file || disabled || state.isLoading}
					>
						<FileUp />
						{state.isLoading ? "Загружаем…" : "Загрузить выписку"}
					</Button>
				</div>
			</form>
		);
	}
);
