import { Building2, Check, ChevronDown, Landmark, Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import { memo, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListAccountsQuery, useListCompaniesQuery } from "@/entities/Company";
import { useWorkspace, workspaceActions } from "@/entities/Workspace";
import { spring } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { cn } from "@/shared/lib/cn/cn";
import { formatMoney } from "@/shared/lib/format/money";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { Input } from "@/shared/ui/Input/Input";
import { PopoverPanel, usePopover } from "@/shared/ui/Popover/Popover";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

/** Переключатель компании и счёта в шапке. Все финансовые экраны работают в выбранной паре. */
export const WorkspaceSwitcher = memo(({ className }: { className?: string }) => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { companyId, accountId } = useWorkspace();
	const p = usePopover(320, 420);
	const [browseCompany, setBrowseCompany] = useState<string | null>(null);
	const shownCompany = browseCompany ?? companyId;

	const companies = useListCompaniesQuery();
	const [query, setQuery] = useState("");
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		const all = companies.data?.items ?? [];
		return (q ? all.filter((c) => c.name.toLowerCase().includes(q) || c.inn?.includes(q)) : all).slice(0, 100);
	}, [companies.data, query]);
	const accounts = useListAccountsQuery(shownCompany, { skip: !shownCompany });
	const currentAccounts = useListAccountsQuery(companyId, { skip: !companyId });

	const company = companies.data?.items.find((c) => c.id === companyId);
	const account = currentAccounts.data?.items.find((a) => a.id === accountId);

	return (
		<>
			<button
				ref={p.anchor}
				type="button"
				aria-haspopup="dialog"
				aria-expanded={p.open}
				onClick={() => {
					setBrowseCompany(null);
					p.setOpen((o) => !o);
				}}
				className={cn(
					"flex h-12 min-w-0 items-center gap-2.5 rounded-md px-2.5 text-left transition-colors outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring",
					className
				)}
			>
				<span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground">
					<Landmark className="size-4" />
				</span>
				<span className="hidden min-w-0 flex-col leading-tight sm:flex">
					<span className="max-w-44 truncate text-sm font-semibold">{company?.name ?? "Компания"}</span>
					<span className="max-w-44 truncate text-xs text-muted-foreground">
						{account ? `${account.name} · ${formatMoney(account.latestBalance)}` : "Выберите счёт"}
					</span>
				</span>
				<motion.span
					animate={{ rotate: p.open ? 180 : 0 }}
					transition={spring.snappy}
					className="flex text-muted-foreground"
				>
					<ChevronDown className="size-4" />
				</motion.span>
			</button>
			<PopoverPanel
				state={p}
				label="Компания и счёт"
				className="w-80 p-2"
			>
				<div className="px-2 pt-1 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Компании
				</div>
				{(companies.data?.items.length ?? 0) > 6 && (
					<div className="px-1 pb-2">
						<Input
							icon={<Search />}
							placeholder="Найти организацию"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							aria-label="Поиск организации"
						/>
					</div>
				)}
				{companies.isLoading ? (
					<Skeleton className="h-10" />
				) : (
					<ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto overscroll-contain">
						{shown.length === 0 && (
							<li className="px-2 py-2 text-sm text-muted-foreground">Ничего не нашлось</li>
						)}
						{shown.map((c) => (
							<li key={c.id}>
								<button
									type="button"
									onClick={() => setBrowseCompany(c.id)}
									className={cn(
										"flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-surface",
										c.id === shownCompany && "bg-accent font-medium text-accent-foreground"
									)}
								>
									<Building2 className="size-4 shrink-0" />
									<span className="min-w-0 flex-1 truncate">{c.name}</span>
									{c.archived && <span className="text-xs opacity-70">архив</span>}
								</button>
							</li>
						))}
					</ul>
				)}
				<div className="my-2 h-px bg-border" />
				<div className="px-2 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Счета</div>
				{accounts.isLoading ? (
					<Skeleton className="h-10" />
				) : (
					<ul className="flex flex-col gap-0.5">
						{accounts.data?.items.length === 0 && (
							<li className="px-2 py-2 text-sm text-muted-foreground">В этой компании пока нет счетов</li>
						)}
						{accounts.data?.items.map((a) => {
							const on = a.id === accountId && shownCompany === companyId;
							return (
								<li key={a.id}>
									<button
										type="button"
										onClick={() => {
											dispatch(
												workspaceActions.selectAccount({
													companyId: shownCompany,
													accountId: a.id,
												})
											);
											p.setOpen(false);
										}}
										className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-surface"
									>
										<span className="min-w-0 flex-1">
											<span className="block truncate font-medium">{a.name}</span>
											<span className="block truncate text-xs text-muted-foreground">
												{a.bankName ?? "Банк не указан"} ·{" "}
												{a.latestBalance !== null
													? formatMoney(a.latestBalance)
													: "остаток неизвестен"}
											</span>
										</span>
										{on && <Check className="size-4 shrink-0 text-brand" />}
									</button>
								</li>
							);
						})}
					</ul>
				)}
				<button
					type="button"
					onClick={() => {
						p.setOpen(false);
						navigate(RoutePath.onboarding);
					}}
					className="mt-2 flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm font-medium text-accent-foreground hover:bg-accent"
				>
					<Plus className="size-4" />
					Добавить компанию или счёт
				</button>
			</PopoverPanel>
		</>
	);
});
