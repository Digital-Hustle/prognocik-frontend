import { useMemo } from "react";
import { parseAnswer } from "@/entities/Assistant";
import type { AssistantFact, Inline } from "@/entities/Assistant";
import { cn } from "@/shared/lib/cn/cn";

/** Текст ответа: абзацы, списки и ссылки [s1]/[f2] как номерные метки. Ничего не исполняем как HTML. */
export const AnswerText = ({
	answer,
	facts,
	onRef,
	active,
}: {
	answer: string;
	facts: AssistantFact[];
	onRef: (id: string) => void;
	active: string | null;
}) => {
	const blocks = useMemo(() => parseAnswer(answer), [answer]);
	const numbers = useMemo(() => {
		const map = new Map<string, number>();
		for (const b of blocks) {
			const lines = b.t === "p" ? [b.inline] : b.items;
			for (const line of lines)
				for (const part of line) if (part.t === "ref" && !map.has(part.id)) map.set(part.id, map.size + 1);
		}
		return map;
	}, [blocks]);

	const render = (line: Inline[]) =>
		line.map((part, i) => {
			if (part.t === "text") return <span key={i}>{part.v}</span>;
			const fact = facts.find((f) => f.id === part.id);
			return (
				<button
					key={i}
					type="button"
					onClick={() => onRef(part.id)}
					title={fact?.text}
					aria-label={`Ссылка ${numbers.get(part.id)}`}
					className={cn(
						"mx-0.5 inline-flex size-5 -translate-y-0.5 items-center justify-center rounded-full bg-surface align-baseline text-xs font-semibold text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-accent-foreground",
						active === part.id && "bg-accent text-accent-foreground"
					)}
				>
					{numbers.get(part.id)}
				</button>
			);
		});

	return (
		<div className="flex flex-col gap-2 text-sm leading-relaxed">
			{blocks.map((b, i) =>
				b.t === "p" ? (
					<p key={i}>{render(b.inline)}</p>
				) : (
					<ul
						key={i}
						className="flex list-disc flex-col gap-1 pl-5 marker:text-muted-foreground"
					>
						{b.items.map((it, j) => (
							<li key={j}>{render(it)}</li>
						))}
					</ul>
				)
			)}
		</div>
	);
};
