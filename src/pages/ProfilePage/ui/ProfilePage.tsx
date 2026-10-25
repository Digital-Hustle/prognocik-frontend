import { MonitorSmartphone, Palette, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useSelector } from "react-redux";
import { getUserAuthData } from "@/entities/User";
import { EditProfileForm } from "@/features/EditProfile";
import { useLogout } from "@/features/Logout";
import { SessionsList } from "@/features/ManageSessions";
import { DemoModeToggle } from "@/features/ToggleDemoMode";
import { fadeUp, stagger } from "@/shared/config/motion";
import { formatInstant } from "@/shared/lib/date/date";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher/ThemeSwitcher";

const ProfilePage = () => {
	const me = useSelector(getUserAuthData);
	const { logout } = useLogout();
	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker={me?.email}
				title={me?.displayName || "Профиль"}
				sub={me ? `С нами с ${formatInstant(me.createdAt)}` : undefined}
			/>
			<motion.div
				variants={stagger(0.06)}
				initial="hidden"
				animate="show"
				className="flex flex-col gap-4"
			>
				<motion.div variants={fadeUp}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<UserRound className="size-5" />
								Имя
							</CardTitle>
						</CardHeader>
						<div className="p-4 sm:p-6">
							<EditProfileForm />
						</div>
					</Card>
				</motion.div>
				<motion.div variants={fadeUp}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MonitorSmartphone className="size-5" />
								Активные сессии
							</CardTitle>
						</CardHeader>
						<div className="p-4 sm:p-6">
							<SessionsList onAllRevoked={() => void logout()} />
						</div>
					</Card>
				</motion.div>
				<motion.div variants={fadeUp}>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Palette className="size-5" />
								Оформление
							</CardTitle>
							<ThemeSwitcher />
						</CardHeader>
						<div className="h-5" />
					</Card>
				</motion.div>
			</motion.div>
			<details className="rounded-lg border border-border bg-card p-4 sm:p-6">
				<summary className="cursor-pointer text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
					Дополнительно
				</summary>
				<div className="mt-3">
					<DemoModeToggle />
				</div>
			</details>
		</div>
	);
};

export default ProfilePage;
