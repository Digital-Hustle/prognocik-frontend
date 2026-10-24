import { Anchor, CalendarCheck, SlidersHorizontal, Users } from "lucide-react";
import { motion } from "motion/react";
import { ROLE_LABEL, useGetAccountQuery, useGetCompanyQuery, useListMembersQuery } from "@/entities/Company";
import { useWorkspace } from "@/entities/Workspace";
import { CompletenessForm } from "@/features/ConfirmCompleteness";
import { ForecastSettingsForm } from "@/features/EditForecastSettings";
import { BalanceAnchorForm } from "@/features/SetBalanceAnchor";
import { fadeUp, stagger } from "@/shared/config/motion";
import { formatDay, formatInstant } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";

const Section = ({
	icon,
	title,
	sub,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	sub: string;
	children: React.ReactNode;
}) => (
	<motion.div
		variants={fadeUp}
		className="min-w-0"
	>
		<Card className="h-full">
			<CardHeader className="items-start">
				<div className="flex min-w-0 items-start gap-3">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground [&_svg]:size-5">
						{icon}
					</span>
					<div className="min-w-0">
						<CardTitle>{title}</CardTitle>
						<p className="text-sm text-muted-foreground">{sub}</p>
					</div>
				</div>
			</CardHeader>
			<div className="p-4 sm:p-6">{children}</div>
		</Card>
	</motion.div>
);

const SettingsPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const account = useGetAccountQuery({ companyId, accountId });
	const perms = company.data?.permissions;
	const members = useListMembersQuery(companyId, { skip: !perms?.canManageMembers });

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker={company.data?.name}
				title="Настройки счёта"
				sub={
					account.data
						? `${account.data.name} · ${account.data.bankName ?? "банк не указан"}${
								account.data.accountNumber ? ` · ${account.data.accountNumber}` : ""
							}`
						: undefined
				}
			/>

			{account.data && (
				<motion.div
					variants={fadeUp}
					initial="hidden"
					animate="show"
					className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl bg-hero px-6 py-5 text-hero-foreground shadow-float"
				>
					<div>
						<div className="text-xs text-hero-muted">Последний известный остаток</div>
						<div className="font-display text-2xl font-semibold tabular-nums">
							{account.data.latestBalance !== null
								? formatMoney(account.data.latestBalance)
								: "нет данных"}
						</div>
					</div>
					<div>
						<div className="text-xs text-hero-muted">На дату</div>
						<div className="font-medium">{formatDay(account.data.latestBalanceDate)}</div>
					</div>
					<div>
						<div className="text-xs text-hero-muted">Валюта</div>
						<div className="font-medium">{account.data.currency}</div>
					</div>
					{account.data.externalCompanyId && (
						<div>
							<div className="text-xs text-hero-muted">Код в выписке</div>
							<div className="font-mono text-sm">{account.data.externalCompanyId}</div>
						</div>
					)}
					{company.data && (
						<Status
							tone="lime"
							className="ml-auto"
						>
							{ROLE_LABEL[company.data.myRole]}
						</Status>
					)}
				</motion.div>
			)}

			<motion.div
				variants={stagger(0.06)}
				initial="hidden"
				animate="show"
				className="grid gap-4 lg:grid-cols-2"
			>
				<div className="lg:col-span-2">
					<Section
						icon={<SlidersHorizontal />}
						title="Параметры прогноза"
						sub="Буфер, горизонт и окно истории. После изменения пересчитайте прогноз."
					>
						<ForecastSettingsForm
							companyId={companyId}
							accountId={accountId}
							disabled={!perms?.canRunForecast}
						/>
					</Section>
				</div>
				<Section
					icon={<Anchor />}
					title="Остаток вручную"
					sub="Если в выписке нет остатка на конец дня — укажите подтверждённую сумму."
				>
					<BalanceAnchorForm
						companyId={companyId}
						accountId={accountId}
						disabled={!perms?.canImport}
					/>
				</Section>
				<Section
					icon={<CalendarCheck />}
					title="Полнота периода"
					sub="Подтвердите, что выписка за период полная: пустые дни станут днями без операций."
				>
					<CompletenessForm
						companyId={companyId}
						accountId={accountId}
						disabled={!perms?.canImport}
					/>
				</Section>
				{perms?.canManageMembers && (
					<div className="lg:col-span-2">
						<Section
							icon={<Users />}
							title="Участники компании"
							sub="Кто видит прогноз и что может менять"
						>
							{members.isLoading ? (
								<Skeleton className="h-16" />
							) : (
								<ul className="flex flex-col gap-1">
									{members.data?.items.map((m) => (
										<li
											key={m.userId}
											className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5 text-sm"
										>
											<span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
												{m.userId}
											</span>
											<span className="text-xs text-muted-foreground">
												с {formatInstant(m.joinedAt)}
											</span>
											<Status tone={m.role === "OWNER" ? "success" : "neutral"}>
												{ROLE_LABEL[m.role]}
											</Status>
										</li>
									))}
								</ul>
							)}
						</Section>
					</div>
				)}
			</motion.div>
		</div>
	);
};

export default SettingsPage;
