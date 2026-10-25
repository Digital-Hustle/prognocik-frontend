import { Sparkles } from "lucide-react";
import { assistantActions } from "@/entities/Assistant";
import type { AssistantContext } from "@/entities/Assistant";
import { useWorkspace } from "@/entities/Workspace";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { Button } from "@/shared/ui/Button/Button";
import type { ButtonProps } from "@/shared/ui/Button/Button";

/** «Спросить про…»: открывает чат с готовым вопросом и (при необходимости) привязкой к прогнозу и разрыву */
export const OpenAssistantButton = ({
	question,
	context,
	children = "Спросить ассистента",
	variant = "secondary",
	size = "sm",
	onClick,
	...rest
}: Omit<ButtonProps, "children"> & {
	question?: string;
	context?: AssistantContext;
	children?: React.ReactNode;
}) => {
	const dispatch = useAppDispatch();
	const { ready } = useWorkspace();
	if (!ready) return null;
	return (
		<Button
			variant={variant}
			size={size}
			{...rest}
			onClick={(e) => {
				onClick?.(e);
				dispatch(assistantActions.open({ context, draft: question }));
			}}
		>
			<Sparkles />
			{children}
		</Button>
	);
};
