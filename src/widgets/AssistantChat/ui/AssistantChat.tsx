import { AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { assistantActions, getAssistantOpen } from "@/entities/Assistant";
import { getUserAuthData } from "@/entities/User";
import { useWorkspace } from "@/entities/Workspace";
import { useAskAssistant } from "@/features/AskAssistant";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { AssistantFab } from "./AssistantFab";
import { AssistantPanel } from "./AssistantPanel";

/**
 * Чат с ИИ-ассистентом. Монтируется один раз над роутером: запрос не обрывается при смене страницы.
 * Разговор привязан к счёту и вошедшему пользователю — при смене счёта или выходе он сбрасывается.
 */
export const AssistantChat = () => {
	const dispatch = useAppDispatch();
	const auth = useSelector(getUserAuthData);
	const open = useSelector(getAssistantOpen);
	const { ready, accountId } = useWorkspace();
	const { send, retry, cancel } = useAskAssistant();
	const fab = useRef<HTMLButtonElement>(null);
	const wasOpen = useRef(false);
	const scope = useRef<string | null>(null);

	const key = auth && ready ? accountId : null;
	useEffect(() => {
		if (scope.current !== null && scope.current !== key) {
			cancel();
			dispatch(assistantActions.reset());
		}
		scope.current = key;
	}, [key, cancel, dispatch]);

	useEffect(() => {
		if (wasOpen.current && !open) fab.current?.focus({ preventScroll: true });
		wasOpen.current = open;
	}, [open]);

	if (!key) return null;

	return (
		<>
			<AnimatePresence>
				{!open && (
					<AssistantFab
						key="fab"
						ref={fab}
						onClick={() => dispatch(assistantActions.open())}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{open && (
					<AssistantPanel
						key="panel"
						send={send}
						retry={retry}
						cancel={cancel}
						onClose={() => dispatch(assistantActions.close())}
					/>
				)}
			</AnimatePresence>
		</>
	);
};
