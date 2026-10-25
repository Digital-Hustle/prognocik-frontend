import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { forwardRef } from "react";
import { popIn, press, tween } from "@/shared/config/motion";

/** Плавающая кнопка «Спросить» в правом нижнем углу всех экранов вошедшего пользователя */
export const AssistantFab = forwardRef<HTMLButtonElement, { onClick: () => void }>(({ onClick }, ref) => (
	<motion.button
		ref={ref}
		type="button"
		onClick={onClick}
		variants={popIn}
		initial="hidden"
		animate="show"
		exit={{ opacity: 0, scale: 0.9, transition: tween.exit }}
		{...press}
		aria-label="Открыть ассистента"
		style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
		className="fixed right-3 z-overlay flex size-12 items-center justify-center gap-2 rounded-full bg-brand-deep font-semibold text-white shadow-glow outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-4 sm:size-auto sm:h-control-lg sm:pr-5 sm:pl-4"
	>
		<Sparkles className="size-5" />
		<span className="hidden sm:inline">Спросить</span>
	</motion.button>
));
AssistantFab.displayName = "AssistantFab";
