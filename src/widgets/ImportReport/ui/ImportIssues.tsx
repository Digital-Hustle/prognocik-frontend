import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { memo, useState } from "react";
import { useListImportIssuesQuery } from "@/entities/Import";
import { cn } from "@/shared/lib/cn/cn";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

const ICON = { ERROR: AlertCircle, WARNING: AlertTriangle, INFO: Info };
const TONE = { ERROR: "text-danger", WARNING: "text-warning", INFO: "text-info" };

/** Ошибки и предупреждения по строкам CSV */
export const ImportIssues = memo(({ companyId, importId }: { companyId: string; importId: string }) => {
	const [severity, setSeverity] = useState<"" | "ERROR" | "WARNING" | "INFO">("");
	const { data, isLoading, error, refetch } = useListImportIssuesQuery({
		companyId,
		importId,
		severity: severity || undefined,
	});

	return (
		<div className="flex flex-col gap-3">
			<Segmented
				size="sm"
				value={severity}
				onChange={setSeverity}
				label="Тип"
				options={[
					{ value: "", label: "Все" },
					{ value: "ERROR", label: "Ошибки" },
					{ value: "WARNING", label: "Предупреждения" },
					{ value: "INFO", label: "Инфо" },
				]}
			/>
			{isLoading ? (
				<Skeleton className="h-24" />
			) : error ? (
				<ErrorState
					error={error}
					onRetry={refetch}
				/>
			) : (data?.items ?? []).length === 0 ? (
				<EmptyState
					className="py-6"
					title="Замечаний нет"
				/>
			) : (
				<ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
					{data?.items.map((i) => {
						const Icon = ICON[i.severity] ?? Info;
						return (
							<li
								key={i.id}
								className="flex gap-3 rounded-md bg-muted px-3 py-2 text-sm"
							>
								<Icon className={cn("mt-0.5 size-4 shrink-0", TONE[i.severity])} />
								<span className="min-w-0 flex-1">
									<span className="block">{i.message}</span>
									<span className="text-xs text-muted-foreground">
										{i.rowNumber !== null ? `Строка ${i.rowNumber}` : "Файл"}
										{i.field ? ` · поле ${i.field}` : ""} · {i.code}
									</span>
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
});
