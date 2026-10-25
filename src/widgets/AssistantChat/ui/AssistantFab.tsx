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
		className="fixed right-4 bottom-4 z-overlay flex h-control-lg items-center gap-2 rounded-full bg-brand-deep pr-5 pl-4 font-semibold text-white shadow-glow outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
	>
		<Sparkles className="size-5" />
		Спросить
	</motion.button>
));
AssistantFab.displayName = "AssistantFab";
