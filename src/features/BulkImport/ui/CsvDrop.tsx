import { FileSpreadsheet, FileUp, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/shared/lib/cn/cn";
import { Button } from "@/shared/ui/Button/Button";

const sizeLabel = (n: number) =>
	n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} КБ` : `${(n / 1024 / 1024).toFixed(1)} МБ`;

/** Выбор одного CSV: клик или перетаскивание. Размер проверяется до отправки. */
export const CsvDrop = ({
	file,
	onFile,
	maxBytes,
	disabled,
	label,
}: {
	file: File | null;
	onFile: (f: File | null) => void;
	maxBytes: number;
	disabled?: boolean;
	label: string;
}) => {
	const input = useRef<HTMLInputElement>(null);
	const [drag, setDrag] = useState(false);
	const [error, setError] = useState("");

	const pick = (f?: File) => {
		if (!f) return;
		if (!/\.csv$/i.test(f.name)) return setError("Нужен файл .csv");
		if (f.size > maxBytes) return setError(`Файл больше ${sizeLabel(maxBytes)}`);
		setError("");
		onFile(f);
	};

	return (
		<div className="flex flex-col gap-2">
			<label
				onDragOver={(e) => {
					e.preventDefault();
					setDrag(true);
				}}
				onDragLeave={() => setDrag(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDrag(false);
					if (!disabled) pick(e.dataTransfer.files?.[0]);
				}}
				className={cn(
					"flex min-h-28 cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-4 py-4 transition-colors duration-fast",
					drag ? "border-brand bg-accent" : "border-border-strong bg-muted hover:bg-surface-hover",
					disabled && "pointer-events-none opacity-60"
				)}
			>
				<input
					ref={input}
					type="file"
					accept=".csv,text/csv"
					className="sr-only"
					disabled={disabled}
					aria-label={label}
					onChange={(e) => {
						pick(e.target.files?.[0]);
						e.target.value = "";
					}}
				/>
				<span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-card text-brand shadow-card">
					{file ? <FileSpreadsheet className="size-6" /> : <FileUp className="size-6" />}
				</span>
				<span className="min-w-0 flex-1 text-sm">
					{file ? (
						<>
							<span className="block truncate font-medium">{file.name}</span>
							<span className="text-xs text-muted-foreground">{sizeLabel(file.size)}</span>
						</>
					) : (
						<>
							<span className="block font-medium">Перетащите CSV или нажмите</span>
							<span className="text-xs text-muted-foreground">до {sizeLabel(maxBytes)}</span>
						</>
					)}
				</span>
				{file && !disabled && (
					<Button
						size="icon-sm"
						variant="quiet"
						aria-label="Убрать файл"
						onClick={(e) => {
							e.preventDefault();
							onFile(null);
						}}
					>
						<X />
					</Button>
				)}
			</label>
			{error && (
				<p
					role="alert"
					className="text-xs text-danger"
				>
					{error}
				</p>
			)}
		</div>
	);
};
