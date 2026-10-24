import { RefreshCw, WifiOff } from "lucide-react";
import { memo } from "react";
import { problemMessage } from "@/shared/api/problem";
import { cn } from "@/shared/lib/cn/cn";
import { Button } from "../Button/Button";

interface ErrorStateProps {
	error: unknown;
	onRetry?: () => void;
	title?: string;
	className?: string;
}

/** Ошибка загрузки: текст из problem+json (detail) и кнопка «Повторить» → refetch */
export const ErrorState = memo(({ error, onRetry, title = "Не удалось загрузить", className }: ErrorStateProps) => (
	<div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-10 text-center", className)}>
		<div className="flex size-12 items-center justify-center rounded-md bg-danger-soft text-danger-soft-foreground">
			<WifiOff className="size-6" />
		</div>
		<div className="font-display text-lg font-semibold tracking-display">{title}</div>
		<p className="max-w-sm text-sm text-balance text-muted-foreground">{problemMessage(error)}</p>
		{onRetry && (
			<Button
				variant="outline"
				size="sm"
				onClick={onRetry}
			>
				<RefreshCw />
				Повторить
			</Button>
		)}
	</div>
));
