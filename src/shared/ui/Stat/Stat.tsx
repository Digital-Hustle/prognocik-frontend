import { motion } from "motion/react";
import { memo } from "react";
import type { ReactNode } from "react";
import { popIn } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";

interface StatProps {
	label: ReactNode;
	value: ReactNode;
	sub?: ReactNode;
	icon?: ReactNode;
	/** hero — плитка-обложка (лес + лайм), danger — тревожная, plain — белая */
	tone?: "plain" | "hero" | "danger" | "lime";
	className?: string;
}

/** KPI-плитка: подпись, крупная сумма Unbounded, пояснение. Появляется пружиной popIn в stagger-контейнере. */
export const Stat = memo(({ label, value, sub, icon, tone = "plain", className }: StatProps) => (
	<motion.div
		variants={popIn}
		className={cn(
			"relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-xl px-5 py-5 shadow-card sm:px-6",
			tone === "plain" && "bg-card",
			tone === "hero" && "bg-hero text-hero-foreground shadow-float",
			tone === "danger" && "bg-danger-soft text-danger-soft-foreground",
			tone === "lime" && "bg-lime text-lime-foreground shadow-lime",
			className
		)}
	>
		{tone === "hero" && (
			<span
				aria-hidden
				className="absolute inset-0 bg-sheen opacity-30"
			/>
		)}
		<dt
			className={cn(
				"relative flex items-center gap-2 truncate text-sm [&_svg]:size-4",
				tone === "hero" ? "text-hero-muted" : tone === "plain" ? "text-muted-foreground" : "opacity-80"
			)}
		>
			{icon}
			{label}
		</dt>
		<dd className="relative truncate font-display text-2xl font-semibold tracking-display tabular-nums sm:text-3xl">
			{value}
		</dd>
		{sub && (
			<dd
				className={cn(
					"relative text-xs text-pretty",
					tone === "hero" ? "text-hero-muted" : tone === "plain" ? "text-muted-foreground" : "opacity-80"
				)}
			>
				{sub}
			</dd>
		)}
	</motion.div>
));
