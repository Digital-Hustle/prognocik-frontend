import { motion } from "motion/react";
import { duration } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";

const spin = { duration: duration.loop / 3, ease: "linear", repeat: Infinity } as const;

export const Spinner = ({ className }: { className?: string }) => (
	<motion.span
		role="status"
		aria-label="Загрузка"
		animate={{ rotate: 360 }}
		transition={spin}
		className={cn(
			"inline-block size-5 shrink-0 rounded-full border-2 border-current border-t-transparent opacity-80",
			className
		)}
	/>
);
