import {
	CalendarClock,
	Plug,
	Users,
	FlaskConical,
	LogOut,
	ScrollText,
	Settings2,
	TrendingUp,
	Upload,
	UserRound,
} from "lucide-react";
import { memo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getUserAuthData } from "@/entities/User";
import { useWorkspace } from "@/entities/Workspace";
import { useLogout } from "@/features/Logout";
import { WorkspaceSwitcher } from "@/features/SelectWorkspace";
import { RoutePath } from "@/shared/const/router";
import { HeaderBar, NavTrack } from "@/shared/ui/HeaderBar/HeaderBar";
import type { NavItem } from "@/shared/ui/HeaderBar/HeaderBar";
import { Logo } from "@/shared/ui/Logo/Logo";
import { PopoverPanel, usePopover } from "@/shared/ui/Popover/Popover";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher/ThemeSwitcher";

const NAV: NavItem[] = [
	{
		to: RoutePath.forecast,
		label: "Прогноз",
		icon: (
			<span className="hidden 2xl:flex">
				<TrendingUp />
			</span>
		),
	},
	{
		to: RoutePath.import,
		label: "Выписки",
		icon: (
			<span className="hidden 2xl:flex">
				<Upload />
			</span>
		),
	},
	{
		to: RoutePath.operations,
		label: "Операции",
		icon: (
			<span className="hidden 2xl:flex">
				<ScrollText />
			</span>
		),
	},
	{
		to: RoutePath.plans,
		label: "Планы и факт",
		icon: (
			<span className="hidden 2xl:flex">
				<CalendarClock />
			</span>
		),
	},
	{
		to: RoutePath.quality,
		label: "Качество",
		icon: (
			<span className="hidden 2xl:flex">
				<FlaskConical />
			</span>
		),
	},
	{
		to: RoutePath.employees,
		label: "Сотрудники",
		icon: (
			<span className="hidden 2xl:flex">
				<Users />
			</span>
		),
	},
	{
		to: RoutePath.integrations,
		label: "Интеграции",
		icon: (
			<span className="hidden 2xl:flex">
				<Plug />
			</span>
		),
	},
	{
		to: RoutePath.settings,
		label: "Настройки",
		icon: (
			<span className="hidden 2xl:flex">
				<Settings2 />
			</span>
		),
	},
];

const ProfileMenu = memo(() => {
	const me = useSelector(getUserAuthData);
	const { logout, isLoading } = useLogout();
	const p = usePopover(260, 260);
	const initial = (me?.displayName || me?.email || "?").trim().charAt(0).toUpperCase();

	return (
		<>
			<button
				ref={p.anchor}
				type="button"
				aria-label="Профиль"
				aria-haspopup="dialog"
				aria-expanded={p.open}
				onClick={() => p.setOpen((o) => !o)}
				className="flex size-11 shrink-0 items-center justify-center rounded-full bg-hero font-display text-sm font-semibold text-hero-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{initial}
			</button>
			<PopoverPanel
				state={p}
				label="Профиль"
				className="w-64 p-2"
			>
				<div className="px-2 pt-1 pb-3">
					<div className="truncate text-sm font-semibold">{me?.displayName || "Без имени"}</div>
					<div className="truncate text-xs text-muted-foreground">{me?.email}</div>
				</div>
				<div className="px-2 pb-2">
					<ThemeSwitcher />
				</div>
				<Link
					to={RoutePath.profile}
					onClick={() => p.setOpen(false)}
					className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-surface"
				>
					<UserRound className="size-4" />
					Профиль и сессии
				</Link>
				<button
					type="button"
					disabled={isLoading}
					onClick={() => void logout()}
					className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-danger hover:bg-danger-soft"
				>
					<LogOut className="size-4" />
					Выйти
				</button>
			</PopoverPanel>
		</>
	);
});

export const Navbar = memo(() => {
	const { ready } = useWorkspace();
	return (
		<HeaderBar inner="h-auto flex-wrap lg:flex-nowrap lg:h-15">
			<Link
				to={RoutePath.main}
				className="shrink-0 rounded-md px-1.5"
				aria-label="ПрогноCIк — на главную"
			>
				<Logo className="hidden sm:inline-flex" />
				<Logo
					compact
					className="sm:hidden"
				/>
			</Link>
			{ready && (
				<NavTrack
					items={NAV}
					className="order-last w-full lg:order-none lg:w-auto lg:flex-1"
				/>
			)}
			<div className="ml-auto flex shrink-0 items-center gap-1.5">
				<WorkspaceSwitcher />
				<ProfileMenu />
			</div>
		</HeaderBar>
	);
});
