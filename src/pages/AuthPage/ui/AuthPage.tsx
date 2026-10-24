import { BellRing, CalendarRange, LineChart } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { AuthForm } from "@/features/AuthByEmail";
import { fadeUp, stagger } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { Aurora } from "@/shared/ui/Aurora/Aurora";
import { Card } from "@/shared/ui/Card/Card";
import { Logo } from "@/shared/ui/Logo/Logo";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher/ThemeSwitcher";
import { HeroChart } from "./HeroChart";

const POINTS = [
	{ icon: LineChart, title: "Остаток на 30 дней", text: "Прогноз по каждому дню на основе вашей выписки" },
	{ icon: BellRing, title: "Разрыв заранее", text: "Когда не хватит, сколько и насколько это вероятно" },
	{ icon: CalendarRange, title: "Налоги и счета", text: "Плановые платежи и обещания клиентов в одном графике" },
];

const AuthPage = () => {
	const navigate = useNavigate();
	return (
		<div className="mx-auto grid min-h-dvh max-w-7xl gap-4 p-3 sm:p-6 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
			<motion.section
				variants={stagger(0.08)}
				initial="hidden"
				animate="show"
				className="relative isolate flex flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-hero p-6 text-hero-foreground shadow-float sm:p-10"
			>
				<Aurora
					tone="hero"
					intensity={0.55}
					className="rounded-2xl"
				/>
				<motion.div variants={fadeUp}>
					<Logo
						inverted
						sub="Банк Центр-инвест"
					/>
				</motion.div>
				<div className="flex flex-col gap-6">
					<motion.h1
						variants={fadeUp}
						className="max-w-xl font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl"
					>
						Узнайте о&nbsp;кассовом разрыве <span className="text-lime">до&nbsp;того</span>, как он случится
					</motion.h1>
					<motion.div variants={fadeUp}>
						<HeroChart />
					</motion.div>
				</div>
				<motion.ul
					variants={stagger(0.06, 0.4)}
					className="grid gap-3 sm:grid-cols-3"
				>
					{POINTS.map(({ icon: Icon, title, text }) => (
						<motion.li
							key={title}
							variants={fadeUp}
							className="flex flex-col gap-1.5 rounded-lg bg-white/6 p-4 backdrop-blur-sm"
						>
							<Icon className="size-5 text-lime" />
							<span className="text-sm font-semibold">{title}</span>
							<span className="text-xs text-pretty text-hero-muted">{text}</span>
						</motion.li>
					))}
				</motion.ul>
			</motion.section>

			<section className="flex flex-col items-center justify-center gap-6 py-6">
				<motion.div
					variants={fadeUp}
					initial="hidden"
					animate="show"
					className="w-full max-w-md"
				>
					<Card className="p-6 sm:p-8">
						<h2 className="mb-1 font-display text-2xl font-semibold">Вход</h2>
						<p className="mb-6 text-sm text-muted-foreground">
							Для владельцев и бухгалтеров малого бизнеса — без паролей
						</p>
						<AuthForm onSuccess={() => navigate(RoutePath.main, { replace: true })} />
					</Card>
				</motion.div>
				<ThemeSwitcher />
			</section>
		</div>
	);
};

export default AuthPage;
