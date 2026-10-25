import { RotateCcw, Sparkles, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
	assistantActions,
	getAssistantContext,
	getAssistantDraft,
	getAssistantMessages,
	getAssistantPending,
	getAssistantPeriod,
} from "@/entities/Assistant";
import type { AssistantPeriod } from "@/entities/Assistant";
import { Composer, PeriodChip } from "@/features/AskAssistant";
import { spring, tween } from "@/shared/config/motion";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { useMediaQuery } from "@/shared/lib/hooks/useMediaQuery/useMediaQuery";
import { EmptyChat } from "./EmptyChat";
import { MessageView } from "./MessageView";
import { TypingBubble } from "./TypingBubble";

/** Правая панель на десктопе, нижняя шторка на телефоне. Не модальная: страница под ней остаётся рабочей. */
export const AssistantPanel = ({
	send,
	retry,
	cancel,
	onClose,
}: {
	send: (text: string) => void;
	retry: (questionId: string) => void;
	cancel: () => void;
	onClose: () => void;
}) => {
	const dispatch = useAppDispatch();
	const messages = useSelector(getAssistantMessages);
	const pending = useSelector(getAssistantPending);
	const period = useSelector(getAssistantPeriod);
	const context = useSelector(getAssistantContext);
	const draft = useSelector(getAssistantDraft);
	const desktop = useMediaQuery("(min-width: 640px)");
	const reduce = useReducedMotion();
	const list = useRef<HTMLDivElement>(null);

	// Новый ответ — к его началу (длинный текст читают сверху), вопрос и ожидание — вниз
	useEffect(() => {
		const el = list.current;
		if (!el) return;
		const last = messages[messages.length - 1];
		const behavior = reduce ? "auto" : "smooth";
		if (last && last.kind !== "user") {
			const node = el.querySelector<HTMLElement>(`[data-mid="${last.id}"]`);
			if (node) {
				// scrollTo в новых браузерах возвращает Promise — из эффекта его отдавать нельзя (React ждёт функцию очистки)
				void el.scrollTo({ top: Math.max(node.offsetTop - 12, 0), behavior });
				return;
			}
		}
		void el.scrollTo({ top: el.scrollHeight, behavior });
	}, [messages, pending, reduce]);

	const setPeriod = (p: AssistantPeriod | null) => dispatch(assistantActions.setPeriod(p));

	return (
		<motion.section
			role="dialog"
			aria-label="Ассистент ПрогноCIк"
			initial={desktop ? { opacity: 0, x: 28, scale: 0.98 } : { y: "100%" }}
			animate={desktop ? { opacity: 1, x: 0, scale: 1 } : { y: 0 }}
			exit={desktop ? { opacity: 0, x: 20, transition: tween.exit } : { y: "100%", transition: spring.sheet }}
			transition={{ ...spring.sheet, opacity: tween.fast }}
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			className="fixed inset-x-0 bottom-0 z-overlay flex h-dvh max-h-sheet min-h-0 flex-col overflow-hidden rounded-t-xl bg-popover text-popover-foreground shadow-pop sm:inset-x-auto sm:top-24 sm:right-4 sm:bottom-4 sm:h-auto sm:w-105 sm:rounded-xl"
		>
			<header className="flex shrink-0 items-center gap-3 px-4 pt-4 pb-3">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-deep text-white">
					<Sparkles className="size-4.5" />
				</span>
				<div className="min-w-0 flex-1">
					<h2 className="font-display text-base leading-tight font-semibold tracking-display">Ассистент</h2>
					<p className="truncate text-xs text-muted-foreground">Отвечает по данным вашего счёта</p>
				</div>
				{messages.length > 0 && (
					<button
						type="button"
						onClick={() => {
							cancel();
							dispatch(assistantActions.clearChat());
						}}
						aria-label="Новый разговор"
						title="Новый разговор"
						className="flex size-control-sm items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-surface hover:text-foreground"
					>
						<RotateCcw className="size-4" />
					</button>
				)}
				<button
					type="button"
					onClick={onClose}
					aria-label="Закрыть"
					className="flex size-control-sm items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-surface hover:text-foreground"
				>
					<X className="size-5" />
				</button>
			</header>

			<div className="flex shrink-0 flex-col gap-2 border-y border-border px-4 py-2.5">
				<PeriodChip
					value={period}
					onChange={setPeriod}
				/>
				{context && (
					<div className="flex min-w-0 items-center gap-2 text-xs">
						<span className="min-w-0 truncate rounded-2xs bg-lime px-2 py-1 font-medium text-lime-foreground">
							{context.label ?? "Выбранный разрыв"}
						</span>
						<button
							type="button"
							onClick={() => dispatch(assistantActions.setContext(null))}
							aria-label="Убрать привязку к разрыву"
							className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface hover:text-foreground"
						>
							<X className="size-3.5" />
						</button>
					</div>
				)}
			</div>

			<div
				ref={list}
				role="log"
				aria-live="polite"
				aria-label="Переписка с ассистентом"
				className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
			>
				{messages.length === 0 && !pending ? (
					<EmptyChat
						onPick={send}
						disabled={pending}
					/>
				) : (
					<div className="flex flex-col gap-4">
						{messages.map((m) => (
							<MessageView
								key={m.id}
								message={m}
								period={period}
								busy={pending}
								onRetry={retry}
								onClarify={(qid, p) => {
									setPeriod(p);
									retry(qid);
								}}
								onResetContext={(qid) => {
									dispatch(assistantActions.setContext(null));
									retry(qid);
								}}
								onResetPeriod={(qid) => {
									setPeriod(null);
									retry(qid);
								}}
							/>
						))}
						{pending && <TypingBubble />}
					</div>
				)}
			</div>

			<Composer
				draft={draft}
				pending={pending}
				focusKey={desktop}
				onSend={send}
				onStop={cancel}
			/>
			<div className="shrink-0 pb-safe" />
		</motion.section>
	);
};
