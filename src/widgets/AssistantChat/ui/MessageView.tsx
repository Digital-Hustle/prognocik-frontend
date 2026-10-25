import { ChevronDown, CircleHelp, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SOURCE_META } from "@/entities/Assistant";
import type { AssistantMessage, AssistantPeriod, ChatRs } from "@/entities/Assistant";
import { fadeUp, spring, tween } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { formatDayShort } from "@/shared/lib/date/date";
import { Status } from "@/shared/ui/Status/Status";
import { AnswerText } from "./AnswerText";
import { ClarifyCard } from "./ClarifyCard";
import { ErrorCard } from "./ErrorCard";
import { SourceChips } from "./SourceChips";

const Warnings = ({ items }: { items: string[] }) =>
	items.length === 0 ? null : (
		<ul className="flex flex-col gap-1.5">
			{items.map((w, i) => (
				<li
					key={i}
					className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground"
				>
					<Info className="mt-px size-3.5 shrink-0" />
					<span>{w}</span>
				</li>
			))}
		</ul>
	);

const AnswerBody = ({
	rs,
	period,
	busy,
	onClarify,
}: {
	rs: ChatRs;
	period: AssistantPeriod | null;
	busy: boolean;
	onClarify: (p: AssistantPeriod) => void;
}) => {
	const [factsOpen, setFactsOpen] = useState(false);
	const [active, setActive] = useState<string | null>(null);
	const answered = rs.status === "ANSWERED";
	const hasFacts = rs.facts.length > 0;

	const onRef = (id: string) => {
		setActive((cur) => (cur === id ? null : id));
		if (id.startsWith("f")) setFactsOpen(true);
	};
	const activeSource = active?.startsWith("s") ? active : (rs.facts.find((f) => f.id === active)?.sourceId ?? null);

	return (
		<div className="flex min-w-0 flex-col gap-2.5">
			<div className="rounded-lg rounded-bl-xs bg-muted px-4 py-3">
				{rs.status === "OUT_OF_SCOPE" && (
					<Status
						tone="neutral"
						className="mb-2 bg-card"
					>
						<CircleHelp />
						Вне темы
					</Status>
				)}
				{rs.status === "INSUFFICIENT_DATA" && (
					<Status
						tone="info"
						className="mb-2"
					>
						<Info />
						Недостаточно данных
					</Status>
				)}
				<AnswerText
					answer={rs.answer}
					facts={rs.facts}
					onRef={onRef}
					active={active}
				/>
				{rs.status === "OUT_OF_SCOPE" && (
					<p className="mt-2 text-xs text-muted-foreground">
						Я помогаю с прогнозом, платежами и разрывами по этому счёту.
					</p>
				)}
				{rs.status === "INSUFFICIENT_DATA" && (
					<p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
						<Link
							to={RoutePath.import}
							className="text-primary underline-offset-2 hover:underline"
						>
							Загрузить выписку
						</Link>
						<Link
							to={RoutePath.quality}
							className="text-primary underline-offset-2 hover:underline"
						>
							Качество данных
						</Link>
					</p>
				)}
			</div>

			{rs.status === "NEEDS_CLARIFICATION" && (
				<ClarifyCard
					initial={period}
					disabled={busy}
					onSubmit={onClarify}
				/>
			)}

			<Warnings items={rs.warnings} />

			{answered && !rs.forecastAvailable && (
				<p className="rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
					Прогноз ещё не построен — ответ только по фактическим платежам.
				</p>
			)}
			{answered && rs.forecastAvailable && rs.forecastStale && (
				<p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
					Прогноз устарел — после новых данных его стоит пересчитать на экране{" "}
					<Link
						to={RoutePath.forecast}
						className="font-medium underline underline-offset-2"
					>
						«Прогноз»
					</Link>
					.
				</p>
			)}

			{hasFacts && (
				<div>
					<button
						type="button"
						onClick={() => setFactsOpen((v) => !v)}
						aria-expanded={factsOpen}
						className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground"
					>
						Факты из данных · {rs.facts.length}
						<motion.span
							animate={{ rotate: factsOpen ? 180 : 0 }}
							transition={spring.hover}
							className="flex"
						>
							<ChevronDown className="size-3.5" />
						</motion.span>
					</button>
					<AnimatePresence initial={false}>
						{factsOpen && (
							<motion.ul
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0, transition: tween.exit }}
								transition={{ height: spring.sheet, opacity: tween.fast }}
								className="flex flex-col gap-1 overflow-hidden"
							>
								{rs.facts.map((f) => {
									const src = rs.sources.find((s) => s.id === f.sourceId);
									return (
										<li
											key={f.id}
											className={
												active === f.id
													? "mt-1 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground"
													: "mt-1 rounded-md bg-surface px-3 py-2 text-xs"
											}
										>
											{f.text}
											{src && (
												<span className="mt-0.5 block text-muted-foreground">
													{SOURCE_META[src.type]?.label ?? "Источник"} · на{" "}
													{formatDayShort(src.asOfDate)}
												</span>
											)}
										</li>
									);
								})}
							</motion.ul>
						)}
					</AnimatePresence>
				</div>
			)}

			{rs.sources.length > 0 && (
				<SourceChips
					sources={rs.sources}
					active={activeSource}
				/>
			)}
			{answered && (
				<p className="text-xs text-subtle-foreground">
					Данные на {formatDayShort(rs.asOfDate)} · ответ ИИ, сверяйте с цифрами на экранах
				</p>
			)}
		</div>
	);
};

/** Одно сообщение переписки */
export const MessageView = ({
	message,
	period,
	busy,
	onRetry,
	onClarify,
	onResetContext,
	onResetPeriod,
}: {
	message: AssistantMessage;
	period: AssistantPeriod | null;
	busy: boolean;
	onRetry: (questionId: string) => void;
	onClarify: (questionId: string, p: AssistantPeriod) => void;
	onResetContext: (questionId: string) => void;
	onResetPeriod: (questionId: string) => void;
}) => (
	<motion.div
		data-mid={message.id}
		variants={fadeUp}
		initial="hidden"
		animate="show"
		className={message.kind === "user" ? "flex justify-end" : "flex justify-start"}
	>
		{message.kind === "user" ? (
			<p className="max-w-5/6 rounded-lg rounded-br-xs bg-brand-deep px-4 py-2.5 text-sm break-words whitespace-pre-wrap text-white">
				{message.content}
			</p>
		) : (
			<div className="max-w-11/12 min-w-0">
				{message.kind === "assistant" ? (
					<AnswerBody
						rs={message.rs}
						period={period}
						busy={busy}
						onClarify={(p) => onClarify(message.questionId, p)}
					/>
				) : (
					<ErrorCard
						error={message.error}
						busy={busy}
						onRetry={() => onRetry(message.questionId)}
						onResetContext={() => onResetContext(message.questionId)}
						onResetPeriod={() => onResetPeriod(message.questionId)}
					/>
				)}
			</div>
		)}
	</motion.div>
);
