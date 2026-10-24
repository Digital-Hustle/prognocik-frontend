import { motion } from "motion/react";
import { memo } from "react";
import { duration, ease } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { LogoMark } from "@/shared/ui/Logo/Logo";

/** Загрузка экрана: знак ПрогноCIка мягко «дышит» */
export const PageLoader = memo(({ fullscreen }: { fullscreen?: boolean }) => (
	<div
		className={cn("flex items-center justify-center", fullscreen ? "min-h-dvh" : "min-h-[50vh]")}
		role="status"
		aria-label="Загрузка"
	>
		<motion.div
			animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
			transition={{ duration: duration.loop / 2, ease: ease.inOut, repeat: Infinity }}
		>
			<LogoMark className="size-14 rounded-md" />
		</motion.div>
	</div>
));
