import { ArrowUp, Square } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_MESSAGE } from "@/entities/Assistant";
import { cn } from "@/shared/lib/cn/cn";

/** Поле ввода: Enter — отправить, Shift+Enter — новая строка, пока ждём ответ — кнопка «Остановить» */
export const Composer = ({
	draft,
	pending,
	focusKey,
	onSend,
	onStop,
}: {
	draft: string;
	pending: boolean;
	/** Истина — поле фокусируется при открытии панели (десктоп); на телефоне фокус не трогаем */
	focusKey: unknown;
	onSend: (text: string) => void;
	onStop: () => void;
}) => {
	const [text, setText] = useState(draft);
	const ref = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (draft) setText(draft);
	}, [draft]);

	useEffect(() => {
		// На телефоне клавиатура сразу закрыла бы подсказки — фокус только на десктопе
		if (!focusKey) return;
		const t = window.setTimeout(() => ref.current?.focus({ preventScroll: true }), 80);
		return () => window.clearTimeout(t);
	}, [focusKey, draft]);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
	}, [text]);

	const over = text.length > MAX_MESSAGE;
	const can = text.trim().length > 0 && !over && !pending;
	const submit = () => {
		if (!can) return;
		onSend(text);
		setText("");
	};

	return (
		<div className="shrink-0 border-t border-border px-3 pt-3 pb-3 sm:px-4">
			<div
				className={cn(
					"flex items-end gap-2 rounded-lg border border-input bg-card py-1.5 pr-1.5 pl-3.5 transition-colors duration-fast focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15",
					over && "border-danger focus-within:border-danger focus-within:ring-danger/15"
				)}
			>
				<textarea
					ref={ref}
					value={text}
					rows={1}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
							e.preventDefault();
							submit();
						}
					}}
					placeholder="Спросите про прогноз, платежи или разрывы"
					aria-label="Вопрос ассистенту"
					className="max-h-35 min-h-control-sm flex-1 resize-none bg-transparent py-1.5 text-base outline-none placeholder:text-subtle-foreground sm:text-sm"
				/>
				{pending ? (
					<button
						type="button"
						onClick={onStop}
						aria-label="Остановить ответ"
						className="flex size-control-sm shrink-0 items-center justify-center rounded-md bg-surface text-foreground transition-colors duration-fast hover:bg-surface-hover"
					>
						<Square className="size-3.5 fill-current" />
					</button>
				) : (
					<button
						type="button"
						onClick={submit}
						disabled={!can}
						aria-label="Отправить"
						className="flex size-control-sm shrink-0 items-center justify-center rounded-md bg-brand-deep text-white transition-opacity duration-fast hover:brightness-105 disabled:opacity-35"
					>
						<ArrowUp className="size-4.5" />
					</button>
				)}
			</div>
			<div className="mt-1.5 flex items-center justify-between px-1 text-xs text-subtle-foreground">
				<span>Enter — отправить, Shift+Enter — новая строка</span>
				{text.length > MAX_MESSAGE - 300 && (
					<span className={cn("tabular-nums", over && "text-danger")}>
						{text.length}/{MAX_MESSAGE}
					</span>
				)}
			</div>
		</div>
	);
};
