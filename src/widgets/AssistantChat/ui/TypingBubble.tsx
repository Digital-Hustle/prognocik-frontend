import { motion, useReducedMotion } from "motion/react";
import { duration } from "@/shared/config/motion";

/** Три точки, пока модель думает (до двух вызовов по 30 секунд) */
export const TypingBubble = () => {
	const reduce = useReducedMotion();
	return (
		<div
			role="status"
			aria-label="Ассистент печатает"
			className="flex w-fit items-center gap-1.5 rounded-lg rounded-bl-xs bg-muted px-4 py-3.5"
		>
			{[0, 1, 2].map((i) => (
				<motion.span
					key={i}
					className="size-1.5 rounded-full bg-muted-foreground"
					animate={reduce ? { opacity: 0.6 } : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
					transition={{ duration: duration.loop / 2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
				/>
			))}
		</div>
	);
};
