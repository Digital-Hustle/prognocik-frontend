import { TriangleAlert } from "lucide-react";
import type { AssistantErrorInfo } from "@/entities/Assistant";
import { Button } from "@/shared/ui/Button/Button";

/** Ошибка вызова. Повтор только вручную: запрос стоит обращения к модели */
export const ErrorCard = ({
	error,
	busy,
	onRetry,
	onResetContext,
	onResetPeriod,
}: {
	error: AssistantErrorInfo;
	busy: boolean;
	onRetry: () => void;
	onResetContext: () => void;
	onResetPeriod: () => void;
}) => (
	<div
		role="alert"
		className="flex flex-col gap-2.5 rounded-lg rounded-bl-xs bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
	>
		<p className="flex items-start gap-2">
			<TriangleAlert className="mt-0.5 size-4 shrink-0" />
			<span>{error.text}</span>
		</p>
		{error.action === "retry" && (
			<Button
				size="sm"
				variant="outline"
				className="self-start"
				disabled={busy}
				onClick={onRetry}
			>
				Повторить
			</Button>
		)}
		{error.action === "reset-context" && (
			<Button
				size="sm"
				variant="outline"
				className="self-start"
				disabled={busy}
				onClick={onResetContext}
			>
				Сбросить и повторить
			</Button>
		)}
		{error.action === "reset-period" && (
			<Button
				size="sm"
				variant="outline"
				className="self-start"
				disabled={busy}
				onClick={onResetPeriod}
			>
				Сбросить период и повторить
			</Button>
		)}
	</div>
);
