import { motion } from "motion/react";
import { memo } from "react";
import { spring, tween } from "@/shared/config/motion";

// Иллюстрация с обложки кейса: история (зелёные точки) → прогноз (пунктир) ныряет к лаймовому кольцу разрыва.
// Это декоративная картинка экрана входа, не данные.
const HISTORY = [
	[20, 150],
	[80, 110],
	[140, 150],
	[200, 92],
	[260, 128],
	[320, 112],
] as const;
const FORECAST = [
	[320, 112],
	[370, 150],
	[440, 236],
	[500, 160],
	[560, 96],
] as const;

const path = (pts: readonly (readonly [number, number])[]) =>
	pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

export const HeroChart = memo(() => (
	<svg
		viewBox="0 0 580 280"
		className="h-auto w-full"
		aria-hidden
	>
		{[60, 110, 160].map((r, i) => (
			<motion.circle
				key={r}
				cx={330}
				cy={140}
				r={r}
				fill="none"
				stroke="rgb(255 255 255 / 0.08)"
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ ...spring.soft, delay: 0.1 + i * 0.08 }}
				style={{ transformOrigin: "330px 140px" }}
			/>
		))}
		<line
			x1="0"
			y1="200"
			x2="580"
			y2="200"
			stroke="rgb(255 255 255 / 0.18)"
			strokeDasharray="4 6"
		/>
		<motion.path
			d={path(HISTORY)}
			fill="none"
			stroke="var(--color-ci-green)"
			strokeWidth="3"
			strokeLinecap="round"
			strokeLinejoin="round"
			initial={{ pathLength: 0 }}
			animate={{ pathLength: 1 }}
			transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
		/>
		{HISTORY.map(([x, y], i) => (
			<motion.circle
				key={`h${x}`}
				cx={x}
				cy={y}
				r={i % 2 ? 11 : 7}
				fill={i % 2 ? "var(--color-ci-green)" : "var(--color-ci-moss)"}
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ ...spring.pop, delay: 0.25 + i * 0.12 }}
				style={{ transformOrigin: `${x}px ${y}px` }}
			/>
		))}
		<motion.path
			d={path(FORECAST)}
			fill="none"
			stroke="var(--color-ci-lime)"
			strokeWidth="3"
			strokeDasharray="7 7"
			strokeLinecap="round"
			initial={{ pathLength: 0, opacity: 0 }}
			animate={{ pathLength: 1, opacity: 1 }}
			transition={{ pathLength: { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 1.1 }, opacity: tween.fast }}
		/>
		{[FORECAST[1], FORECAST[4]].map(([x, y], i) => (
			<motion.circle
				key={`f${x}`}
				cx={x}
				cy={y}
				r={8}
				fill="none"
				stroke="var(--color-ci-lime)"
				strokeWidth="2.5"
				strokeDasharray="3 3"
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ ...spring.pop, delay: 1.4 + i * 0.5 }}
				style={{ transformOrigin: `${x}px ${y}px` }}
			/>
		))}
		<motion.circle
			cx={440}
			cy={236}
			r={30}
			fill="var(--color-ci-lime)"
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: [0.9, 1.5, 0.9], opacity: [0.35, 0, 0.35] }}
			transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}
			style={{ transformOrigin: "440px 236px" }}
		/>
		<motion.circle
			cx={440}
			cy={236}
			r={18}
			fill="var(--color-ci-forest)"
			stroke="var(--color-ci-lime)"
			strokeWidth="11"
			initial={{ scale: 0 }}
			animate={{ scale: 1 }}
			transition={{ ...spring.pop, delay: 1.9 }}
			style={{ transformOrigin: "440px 236px" }}
		/>
	</svg>
));
