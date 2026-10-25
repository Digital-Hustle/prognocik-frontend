import { ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { SUGGESTIONS } from "@/entities/Assistant";
import { fadeUp, stagger } from "@/shared/config/motion";

export const EmptyChat = ({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) => (
	<motion.div
		variants={stagger()}
		initial="hidden"
		animate="show"
		className="flex flex-col gap-5 py-2"
	>
		<motion.div
			variants={fadeUp}
			className="flex flex-col items-start gap-3"
		>
			<span className="flex size-11 items-center justify-center rounded-lg bg-brand-deep text-white shadow-glow">
				<Sparkles className="size-5" />
			</span>
			<div>
				<h3 className="font-display text-lg font-semibold tracking-display">Спросите про свои деньги</h3>
				<p className="mt-1 text-sm text-muted-foreground">
					Объясню разрыв, расходы и качество прогноза. Отвечаю только по данным этого счёта и показываю,
					откуда взяты цифры.
				</p>
			</div>
		</motion.div>
		<motion.ul
			variants={stagger()}
			className="flex flex-col gap-1.5"
		>
			{SUGGESTIONS.map((q) => (
				<motion.li
					key={q}
					variants={fadeUp}
				>
					<button
						type="button"
						disabled={disabled}
						onClick={() => onPick(q)}
						className="w-full rounded-md bg-muted px-3.5 py-2.5 text-left text-sm transition-colors duration-fast hover:bg-surface disabled:opacity-50"
					>
						{q}
					</button>
				</motion.li>
			))}
		</motion.ul>
		<motion.p
			variants={fadeUp}
			className="flex items-start gap-2 text-xs text-muted-foreground"
		>
			<ShieldCheck className="mt-px size-3.5 shrink-0" />
			История переписки хранится только в этой вкладке и пропадает при выходе.
		</motion.p>
	</motion.div>
);
