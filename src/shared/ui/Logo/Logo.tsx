import { memo } from "react";
import { cn } from "@/shared/lib/cn/cn";

/**
 * Знак ПрогноCIка: суперэллипс цвета «лес» с линией прогноза, которая ныряет вниз к лаймовому кольцу —
 * та же метафора, что на обложке кейса (точка кассового разрыва).
 */
export const LogoMark = memo(({ className }: { className?: string }) => (
	<span
		className={cn(
			"relative isolate flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-hero shadow-glow",
			className
		)}
	>
		<span
			aria-hidden
			className="absolute inset-0 bg-sheen opacity-40"
		/>
		<svg
			viewBox="0 0 32 32"
			className="relative size-4/5"
			fill="none"
			aria-hidden
		>
			<path
				d="M5 17l5-6 5 4 4-7"
				stroke="var(--color-ci-green)"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M19 8l4 12"
				stroke="var(--color-ci-lime)"
				strokeWidth="2.4"
				strokeLinecap="round"
				strokeDasharray="2 3.2"
			/>
			<circle
				cx="24"
				cy="23"
				r="3.4"
				stroke="var(--color-ci-lime)"
				strokeWidth="2.6"
			/>
		</svg>
	</span>
));

interface LogoProps {
	className?: string;
	compact?: boolean;
	sub?: string;
	/** На тёмной плитке-герое */
	inverted?: boolean;
}

/** «ПрогноCIк»: CI — Центр-инвест — выделено лаймовой плашкой. */
export const Logo = memo(({ className, compact, sub, inverted }: LogoProps) => (
	<span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
		<LogoMark />
		{!compact && (
			<span className="flex min-w-0 flex-col leading-none">
				<span
					className={cn(
						"truncate font-display text-lg font-semibold tracking-display",
						inverted && "text-hero-foreground"
					)}
				>
					Прогно
					<span className="mx-px rounded-2xs bg-lime px-1 text-lime-foreground">CI</span>к
				</span>
				{sub && (
					<span
						className={cn("mt-1 truncate text-xs", inverted ? "text-hero-muted" : "text-muted-foreground")}
					>
						{sub}
					</span>
				)}
			</span>
		)}
	</span>
));
