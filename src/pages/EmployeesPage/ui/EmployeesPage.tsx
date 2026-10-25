import { Banknote, Pencil, UserPlus, Users } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useGetCompanyQuery } from "@/entities/Company";
import { useListEmployeesQuery } from "@/entities/Employee";
import type { Employee } from "@/entities/Employee";
import { describeSchedule } from "@/entities/Recurring";
import { useWorkspace } from "@/entities/Workspace";
import { EmployeeActions, EmployeeFormDialog, SalaryDialog } from "@/features/ManageEmployees";
import { fadeUp, stagger } from "@/shared/config/motion";
import { formatMoney, toNumber } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { Status } from "@/shared/ui/Status/Status";
import { SwitchRow } from "@/shared/ui/Switch/Switch";

const EmployeesPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const canEdit = company.data?.permissions.canManagePlans ?? false;
	const [archived, setArchived] = useState(false);
	const { data, isLoading, error, refetch } = useListEmployeesQuery({ companyId, includeArchived: archived });
	const [formFor, setFormFor] = useState<Employee | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [salaryFor, setSalaryFor] = useState<Employee | null>(null);
	const [salaryOpen, setSalaryOpen] = useState(false);

	const items = useMemo(() => data?.items ?? [], [data]);
	const stats = useMemo(() => {
		const active = items.filter((e) => !e.archived);
		const paid = active.filter((e) => e.recurringPayment?.status === "CONFIRMED");
		const monthly = paid
			.filter((e) => e.recurringPayment?.schedule.frequency === "MONTHLY")
			.reduce((s, e) => s + (toNumber(e.recurringPayment?.amount) ?? 0), 0);
		return { active: active.length, paid: paid.length, monthly };
	}, [items]);

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker="Зарплата в прогнозе"
				title="Сотрудники и выплаты"
				sub="Укажите оклад и дату выплаты — прогноз заменит старые выплаты этому человеку расписанием и учтёт будущие зарплаты по датам."
				actions={
					canEdit ? (
						<Button
							variant="brand"
							onClick={() => {
								setFormFor(null);
								setFormOpen(true);
							}}
						>
							<UserPlus />
							Добавить сотрудника
						</Button>
					) : undefined
				}
			/>

			{data && (
				<motion.dl
					variants={stagger(0.05)}
					initial="hidden"
					animate="show"
					className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3"
				>
					<Stat
						label="Сотрудников"
						value={stats.active}
						icon={<Users />}
					/>
					<Stat
						label="Зарплата в прогнозе"
						value={stats.paid}
						sub="сотрудников с подтверждённой выплатой"
						icon={<Banknote />}
					/>
					<Stat
						tone="hero"
						label="В месяц по месячным выплатам"
						value={`−${formatMoney(stats.monthly)}`}
						sub="без налогов и взносов: считаем только введённые суммы"
					/>
				</motion.dl>
			)}

			<Card className="px-3 sm:px-4">
				<SwitchRow
					title="Показать архивных"
					text="Архивные карточки доступны только для чтения"
					checked={archived}
					onChange={setArchived}
				/>
			</Card>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					{Array.from({ length: 3 }, (_, i) => (
						<Skeleton
							key={i}
							className="h-24 rounded-xl"
						/>
					))}
				</div>
			) : error ? (
				<Card>
					<ErrorState
						error={error}
						onRetry={refetch}
					/>
				</Card>
			) : items.length === 0 ? (
				<Card>
					<EmptyState
						icon={<Users />}
						title="Сотрудников пока нет"
						text="Добавьте человека и задайте зарплату — прогноз перестанет угадывать её по истории."
					/>
				</Card>
			) : (
				<motion.ul
					variants={stagger(0.04)}
					initial="hidden"
					animate="show"
					className="flex flex-col gap-2"
				>
					{items.map((e) => {
						const p = e.recurringPayment;
						return (
							<motion.li
								key={e.id}
								variants={fadeUp}
							>
								<Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="truncate font-semibold">{e.fullName}</span>
											{e.archived && <Status>В архиве</Status>}
											{p && !e.archived && (
												<Status tone={p.status === "CONFIRMED" ? "success" : "neutral"}>
													{p.status === "CONFIRMED"
														? "Зарплата в прогнозе"
														: "Выплата отключена"}
												</Status>
											)}
										</div>
										<div className="truncate text-xs text-muted-foreground">
											{e.position ?? "Должность не указана"}
											{e.note ? ` · ${e.note}` : ""}
										</div>
									</div>
									<div className="shrink-0 sm:w-64 sm:text-right">
										{p ? (
											<>
												<div className="font-display font-semibold tabular-nums">
													−{formatMoney(p.amount)}
												</div>
												<div className="text-xs text-muted-foreground">
													{describeSchedule(p.schedule)}
													{p.observations === 0 ? " · задано вручную" : ""}
												</div>
											</>
										) : (
											<span className="text-sm text-muted-foreground">Зарплата не задана</span>
										)}
									</div>
									{canEdit && !e.archived && (
										<div className="flex shrink-0 flex-wrap gap-1">
											<Button
												size="sm"
												variant="quiet"
												onClick={() => {
													setSalaryFor(e);
													setSalaryOpen(true);
												}}
											>
												<Banknote />
												{p?.status === "CONFIRMED" ? "Изменить сумму" : "Задать зарплату"}
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => {
													setFormFor(e);
													setFormOpen(true);
												}}
											>
												<Pencil />
												Карточка
											</Button>
											<EmployeeActions
												companyId={companyId}
												employee={e}
											/>
										</div>
									)}
								</Card>
							</motion.li>
						);
					})}
				</motion.ul>
			)}

			<EmployeeFormDialog
				open={formOpen}
				onClose={() => setFormOpen(false)}
				companyId={companyId}
				employee={formFor}
			/>
			{salaryFor && (
				<SalaryDialog
					open={salaryOpen}
					onClose={() => setSalaryOpen(false)}
					companyId={companyId}
					accountId={accountId}
					employee={items.find((x) => x.id === salaryFor.id) ?? salaryFor}
				/>
			)}
		</div>
	);
};

export default EmployeesPage;
