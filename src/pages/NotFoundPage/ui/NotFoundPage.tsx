import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { popIn } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { Button } from "@/shared/ui/Button/Button";
import { Logo } from "@/shared/ui/Logo/Logo";

const NotFoundPage = () => (
	<div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
		<Logo />
		<motion.div
			variants={popIn}
			initial="hidden"
			animate="show"
			className="text-brand-gradient font-display text-[clamp(96px,22vw,200px)] leading-none font-bold"
		>
			404
		</motion.div>
		<p className="max-w-sm text-muted-foreground">Такой страницы нет. Возможно, ссылка устарела.</p>
		<Link to={RoutePath.main}>
			<Button variant="brand">
				<ArrowLeft />
				На главную
			</Button>
		</Link>
	</div>
);

export default NotFoundPage;
