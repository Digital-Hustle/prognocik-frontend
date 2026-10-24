import { AnimatePresence, motion } from "motion/react";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { pageIn, tween } from "@/shared/config/motion";
import { Navbar } from "@/widgets/Navbar";
import { PageLoader } from "@/widgets/PageLoader";

/** Оболочка вошедшего пользователя: плавающая шапка-пилюля и смена страниц пружиной */
export const AppLayout = ({ children }: { children: ReactNode }) => {
	const { pathname } = useLocation();
	return (
		<div className="flex min-h-dvh flex-col">
			<Navbar />
			<AnimatePresence
				mode="wait"
				initial={false}
			>
				<motion.main
					key={pathname}
					{...pageIn}
					exit={{ opacity: 0, transition: tween.exit }}
					className="mx-auto w-full max-w-7xl flex-1 px-3 pt-6 pb-16 sm:px-6 sm:pt-10"
				>
					<Suspense fallback={<PageLoader />}>{children}</Suspense>
				</motion.main>
			</AnimatePresence>
		</div>
	);
};
