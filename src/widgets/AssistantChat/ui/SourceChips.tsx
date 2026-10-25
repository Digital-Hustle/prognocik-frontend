import { Link } from "react-router-dom";
import { SOURCE_META } from "@/entities/Assistant";
import type { AssistantSource } from "@/entities/Assistant";
import { cn } from "@/shared/lib/cn/cn";
import { formatDayShort } from "@/shared/lib/date/date";

const sourceLabel = (s: AssistantSource) => SOURCE_META[s.type]?.label ?? "Источник";

const period = (s: AssistantSource) =>
	s.fromDate && s.toDate
		? `${formatDayShort(s.fromDate)} — ${formatDayShort(s.toDate)}`
		: `на ${formatDayShort(s.asOfDate)}`;

/** Источники ответа: каждый ведёт на экран приложения, а не на путь API из href */
export const SourceChips = ({ sources, active }: { sources: AssistantSource[]; active: string | null }) => (
	<ul
		className="flex flex-wrap gap-1.5"
		aria-label="Источники ответа"
	>
		{sources.map((s) => {
			const to = SOURCE_META[s.type]?.to;
			const cls = cn(
				"flex h-7 items-center gap-1.5 rounded-sm bg-surface px-2.5 text-xs transition-colors duration-fast",
				to && "hover:bg-surface-hover",
				active === s.id && "bg-accent text-accent-foreground"
			);
			const body = (
				<>
					<span className="font-medium">{sourceLabel(s)}</span>
					<span className="text-muted-foreground">{period(s)}</span>
					{s.staleness === "STALE" && <span className="text-warning">устарел</span>}
				</>
			);
			return (
				<li key={s.id}>
					{to ? (
						<Link
							to={to}
							className={cls}
						>
							{body}
						</Link>
					) : (
						<span className={cls}>{body}</span>
					)}
				</li>
			);
		})}
	</ul>
);
