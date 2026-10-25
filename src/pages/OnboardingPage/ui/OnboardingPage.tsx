import { ArrowLeft, Building2, ChevronRight, Landmark, Plus, Presentation, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_LABEL, useListAccountsQuery, useListCompaniesQuery } from "@/entities/Company";
import type { Account, Company } from "@/entities/Company";
import { useWorkspace, workspaceActions } from "@/entities/Workspace";
import { CreateAccountForm } from "@/features/CreateAccount";
import { CreateCompanyForm } from "@/features/CreateCompany";
import { useLogout } from "@/features/Logout";
import { fadeUp, liftArea, liftItem, spring, stagger } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { cn } from "@/shared/lib/cn/cn";
import { formatMoney } from "@/shared/lib/format/money";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { AutoHeight } from "@/shared/ui/AutoHeight/AutoHeight";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Input } from "@/shared/ui/Input/Input";
import { Logo } from "@/shared/ui/Logo/Logo";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";

/** Поиск появляется, когда организаций больше, чем помещается взглядом (после массовой загрузки их сотни) */
const SEARCH_FROM = 6;
const VISIBLE = 50;

const Steps = ({ step }: { step: 1 | 2 }) => (
	<div className="flex items-center gap-2">
		{[1, 2].map((n) => (
			<motion.span
				key={n}
				layout
				transition={spring.snappy}
				className={cn("h-1.5 rounded-full", n <= step ? "w-10 bg-brand" : "w-5 bg-border-strong")}
			/>
		))}
		<span className="ml-1 text-xs text-muted-foreground">Шаг {step} из 2</span>
	</div>
);

const ChoiceRow = ({
	icon,
	title,
	sub,
	badge,
	onClick,
}: {
	icon: React.ReactNode;
	title: string;
	sub?: string;
	badge?: React.ReactNode;
	onClick: () => void;
}) => (
	<motion.li
		variants={fadeUp}
		{...liftArea}
	>
		<motion.button
			variants={liftItem}
			type="button"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-lg bg-muted p-4 text-left outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
		>
			<span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-hero text-lime [&_svg]:size-5">
				{icon}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-semibold">{title}</span>
				{sub && <span className="block truncate text-sm text-muted-foreground">{sub}</span>}
			</span>
			{badge}
			<ChevronRight className="size-5 shrink-0 text-muted-foreground" />
		</motion.button>
	</motion.li>
);

const OnboardingPage = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { logout } = useLogout();
	const ws = useWorkspace();
	const [company, setCompany] = useState<Company | null>(null);
	const [creating, setCreating] = useState(false);
	const companies = useListCompaniesQuery();
	const accounts = useListAccountsQuery(company?.id ?? "", { skip: !company });
	const step: 1 | 2 = company ? 2 : 1;

	const chooseAccount = (c: Company, a: Account) => {
		dispatch(workspaceActions.selectAccount({ companyId: c.id, accountId: a.id }));
		// Нет остатка — значит нет данных: сразу на загрузку выписки
		navigate(a.latestBalance === null && c.permissions.canImport ? RoutePath.import : RoutePath.forecast, {
			replace: true,
		});
	};

	const [query, setQuery] = useState("");
	const all = useMemo(() => companies.data?.items.filter((c) => !c.archived) ?? [], [companies.data]);
	const list = useMemo(() => {
		const q = query.trim().toLowerCase();
		return q ? all.filter((c) => c.name.toLowerCase().includes(q) || c.inn?.includes(q)) : all;
	}, [all, query]);
	const accountList = accounts.data?.items.filter((a) => !a.archived) ?? [];

	return (
		<div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-3 py-6 sm:px-6 sm:py-10">
			<div className="flex items-center justify-between">
				<Logo sub="Банк Центр-инвест" />
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						className="hidden sm:inline-flex"
						onClick={() => navigate(RoutePath.demo_import)}
					>
						<Presentation />
						Демо
					</Button>
					{ws.ready && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate(RoutePath.forecast)}
						>
							К прогнозу
						</Button>
					)}
					<Button
						variant="quiet"
						size="sm"
						onClick={() => void logout()}
					>
						Выйти
					</Button>
				</div>
			</div>

			<Card className="p-5 sm:p-8">
				<Steps step={step} />
				<AutoHeight className="mt-5">
					<AnimatePresence
						mode="wait"
						initial={false}
					>
						{step === 1 ? (
							<motion.div
								key={creating ? "create-company" : "companies"}
								variants={fadeUp}
								initial="hidden"
								animate="show"
								exit="exit"
								className="flex flex-col gap-5"
							>
								<div>
									<h1 className="font-display text-2xl font-semibold sm:text-3xl">
										{creating ? "Новая компания" : "Какой бизнес считаем?"}
									</h1>
									<p className="mt-1 text-sm text-muted-foreground">
										{creating
											? "Реквизиты можно поправить позже"
											: "Выберите компанию или добавьте новую — вы станете её владельцем"}
									</p>
								</div>
								{creating ? (
									<>
										<CreateCompanyForm
											onCreated={(c) => {
												setCreating(false);
												dispatch(workspaceActions.selectCompany(c.id));
												setCompany(c);
											}}
										/>
										{list.length > 0 && (
											<Button
												variant="ghost"
												onClick={() => setCreating(false)}
											>
												<ArrowLeft />
												Выбрать существующую
											</Button>
										)}
									</>
								) : companies.isLoading ? (
									<div className="flex flex-col gap-2">
										<Skeleton className="h-20 rounded-lg" />
										<Skeleton className="h-20 rounded-lg" />
									</div>
								) : companies.error ? (
									<ErrorState
										error={companies.error}
										onRetry={companies.refetch}
									/>
								) : (
									<>
										{all.length > SEARCH_FROM && (
											<Input
												icon={<Search />}
												placeholder={`Поиск среди ${all.length} организаций: название или ИНН`}
												value={query}
												onChange={(e) => setQuery(e.target.value)}
												aria-label="Поиск организации"
											/>
										)}
										{query && list.length === 0 && (
											<p className="text-sm text-muted-foreground">Ничего не нашлось.</p>
										)}
										{list.length > 0 && (
											<motion.ul
												variants={stagger()}
												initial="hidden"
												animate="show"
												className="flex flex-col gap-2"
											>
												{list.slice(0, VISIBLE).map((c) => (
													<ChoiceRow
														key={c.id}
														icon={<Building2 />}
														title={c.name}
														sub={[c.inn && `ИНН ${c.inn}`, c.timezone]
															.filter(Boolean)
															.join(" · ")}
														badge={<Status>{ROLE_LABEL[c.myRole]}</Status>}
														onClick={() => {
															dispatch(workspaceActions.selectCompany(c.id));
															setCompany(c);
														}}
													/>
												))}
											</motion.ul>
										)}
										{list.length > VISIBLE && (
											<p className="text-xs text-muted-foreground">
												Показаны {VISIBLE} из {list.length} — уточните поиск.
											</p>
										)}
										<Button
											variant={list.length ? "outline" : "brand"}
											size="lg"
											onClick={() => setCreating(true)}
										>
											<Plus />
											Добавить компанию
										</Button>
										<button
											type="button"
											onClick={() => navigate(RoutePath.demo_import)}
											className="flex items-center gap-3 rounded-lg border border-dashed border-border-strong p-4 text-left outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
										>
											<span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground [&_svg]:size-5">
												<Presentation />
											</span>
											<span className="min-w-0 flex-1">
												<span className="block font-semibold">Демо-показ</span>
												<span className="block text-sm text-muted-foreground">
													Загрузить все организации и операции из CSV
												</span>
											</span>
											<ChevronRight className="size-5 shrink-0 text-muted-foreground" />
										</button>
									</>
								)}
							</motion.div>
						) : (
							<motion.div
								key={creating ? "create-account" : `accounts-${company?.id}`}
								variants={fadeUp}
								initial="hidden"
								animate="show"
								exit="exit"
								className="flex flex-col gap-5"
							>
								<div>
									<div className="mb-1 text-sm font-medium text-accent-foreground">
										{company?.name}
									</div>
									<h1 className="font-display text-2xl font-semibold sm:text-3xl">
										{creating ? "Новый счёт" : "Какой счёт прогнозируем?"}
									</h1>
									<p className="mt-1 text-sm text-muted-foreground">
										Прогноз строится по каждому рублёвому счёту отдельно
									</p>
								</div>
								{creating && company ? (
									<CreateAccountForm
										companyId={company.id}
										onCreated={(a) => chooseAccount(company, a)}
									/>
								) : accounts.isLoading ? (
									<Skeleton className="h-20 rounded-lg" />
								) : accounts.error ? (
									<ErrorState
										error={accounts.error}
										onRetry={accounts.refetch}
									/>
								) : (
									<>
										{accountList.length > 0 && (
											<motion.ul
												variants={stagger()}
												initial="hidden"
												animate="show"
												className="flex flex-col gap-2"
											>
												{accountList.map((a) => (
													<ChoiceRow
														key={a.id}
														icon={<Landmark />}
														title={a.name}
														sub={`${a.bankName ?? "Банк не указан"}${a.accountNumber ? ` · ••${a.accountNumber.slice(-4)}` : ""}`}
														badge={
															<span className="hidden font-display text-sm font-semibold tabular-nums sm:block">
																{a.latestBalance !== null
																	? formatMoney(a.latestBalance)
																	: "нет данных"}
															</span>
														}
														onClick={() => company && chooseAccount(company, a)}
													/>
												))}
											</motion.ul>
										)}
										{company?.permissions.canImport && (
											<Button
												variant={accountList.length ? "outline" : "brand"}
												size="lg"
												onClick={() => setCreating(true)}
											>
												<Plus />
												Добавить счёт
											</Button>
										)}
									</>
								)}
								<Button
									variant="ghost"
									onClick={() => {
										setCreating(false);
										setCompany(null);
									}}
								>
									<ArrowLeft />
									Другая компания
								</Button>
							</motion.div>
						)}
					</AnimatePresence>
				</AutoHeight>
			</Card>
		</div>
	);
};

export default OnboardingPage;
