import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { motionTokens, spring, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";

type ToastItem = { id: number; text: string; tone: "success" | "error" | "info" };

// Маленький внешний стор вместо zustand: тосты не часть бизнес-состояния, держать их в Redux незачем.
let list: ToastItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};
const drop = (id: number) => {
	list = list.filter((x) => x.id !== id);
	emit();
};
const push = (t: Omit<ToastItem, "id">) => {
	const id = Date.now() + Math.random();
	list = [...list.slice(-2), { ...t, id }];
	emit();
	setTimeout(() => drop(id), t.tone === "error" ? motionTokens.toast.errorDurationMs : motionTokens.toast.durationMs);
};

export const toast = {
	success: (text: string) => push({ text, tone: "success" }),
	error: (text: string) => push({ text, tone: "error" }),
	info: (text: string) => push({ text, tone: "info" }),
};

const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONE = { success: "text-lime", error: "text-danger", info: "text-info" };

export const Toaster = () => {
	const items = useSyncExternalStore(
		subscribe,
		() => list,
		() => list
	);
	return (
		<div className="pointer-events-none fixed inset-x-0 top-0 z-toast flex flex-col items-center gap-2 px-4 pt-safe">
			<div className="h-3" />
			<AnimatePresence>
				{items.map((t) => {
					const Icon = ICON[t.tone];
					return (
						<motion.button
							key={t.id}
							type="button"
							layout
							onClick={() => drop(t.id)}
							initial={{ y: -32, opacity: 0, scale: 0.9 }}
							animate={{ y: 0, opacity: 1, scale: 1 }}
							exit={{ y: -16, opacity: 0, scale: 0.96, transition: tween.exit }}
							transition={{ ...spring.pop, opacity: tween.fast }}
							className="pointer-events-auto flex min-h-control-md max-w-full items-center gap-3 rounded-full bg-inverse py-2.5 pr-5 pl-4 text-left text-sm font-medium text-inverse-foreground shadow-pop sm:max-w-md"
						>
							<Icon className={cn("size-5 shrink-0", TONE[t.tone])} />
							<span className="min-w-0">{t.text}</span>
						</motion.button>
					);
				})}
			</AnimatePresence>
		</div>
	);
};
