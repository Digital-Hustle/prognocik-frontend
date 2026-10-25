import { ArrowDownLeft, ArrowUpRight, CalendarDays, Repeat2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { dataAsOfDate, useGetAccountQuery, useGetCompanyQuery } from "@/entities/Company";
import { useCategoryNames } from "@/entities/Payment";
import { describeSchedule, useListRecurringPatternsQuery } from "@/entities/Recurring";
import type { PatternStatus } from "@/entities/Recurring";
import { useWorkspace } from "@/entities/Workspace";
import { ConfirmAllDetectedButton, DecideRecurringButtons, DetectRecurringButton } from "@/features/DetectRecurring";
import { fadeUp, popIn, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { formatDayShort } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { plural } from "@/shared/lib/format/plural";
import { Card } from "@/shared/ui/Card/Card";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";
import type { Tone } from "@/shared/ui/Status/Status";

const STATUS: Record<PatternStatus, { label: string; tone: Tone }> = {
	DETECTED: { label: "Найдено — нужно решение", tone: "info" },
	CONFIRMED: { label: "Учитывается в прогнозе", tone: "success" },
	EXCLUDED: { label: "Исключено", tone: "neutral" },
};

type Filter = "ALL" | PatternStatus;

const RecurringPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const account = useGetAccountQuery({ companyId, accountId });
	const canEdit = company.data?.permissions.canEditPayments ?? false;
	const names = useCategoryNames(companyId);
	const { data, isLoading, error, refetch } = useListRecurringPatternsQuery({ companyId, accountId });
	const [filter, setFilter] = useState<Filter>("ALL");

	const items = useMemo(() => {
		const order: Record<PatternStatus, number> = { DETECTED: 0, CONFIRMED: 1, EXCLUDED: 2 };
		return [...(data?.items ?? [])]
			.filter((p) => filter === "ALL" || p.status === filter)
			.sort((a, b) => order[a.status] - order[b.status] || Number(b.amount) - Number(a.amount));
	}, [data, filter]);
	const count = (s: PatternStatus) => data?.items.filter((p) => p.status === s).length ?? 0;

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker="Шаг 2 · закономерности"
				title="Регулярные платежи"
				sub="Аренда, зарплата, подписки, постоянные клиенты. Подтверждённые регулярности прогноз ставит на свои даты, а не размазывает по средним."
				actions={
					<div className="flex flex-wrap items-center gap-2">
						{canEdit && count("DETECTED") > 0 && (
							<ConfirmAllDetectedButton
								companyId={companyId}
								accountId={accountId}
								count={count("DETECTED")}
							/>
						)}
						<DetectRecurringButton
							companyId={companyId}
							accountId={accountId}
							disabled={!canEdit || !account.data}
							asOfDate={dataAsOfDate(account.data)}
							label={data?.items.length ? "Искать заново" : "Найти регулярные платежи"}
						/>
					</div>
				}
			/>

			{data && data.items.length > 0 && (
				<motion.div
					variants={fadeUp}
					initial="hidden"
					animate="show"
				>
					<Segmented
						value={filter}
						onChange={setFilter}
						label="Фильтр"
						options={[
							{ value: "ALL", label: `Все · ${data.items.length}` },
							{ value: "DETECTED", label: `Новые · ${count("DETECTED")}` },
							{ value: "CONFIRMED", label: `Учитываются · ${count("CONFIRMED")}` },
							{ value: "EXCLUDED", label: `Исключены · ${count("EXCLUDED")}` },
						]}
					/>
				</motion.div>
			)}

			{isLoading ? (
				<div className="grid gap-3 md:grid-cols-2">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton
							key={i}
							className="h-40 rounded-xl"
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
			) : (data?.items ?? []).length === 0 ? (
				<Card>
					<EmptyState
						icon={<Repeat2 />}
						title="Регулярности ещё не искали"
						text="Запустите поиск — сервис найдёт повторяющиеся поступления и списания по истории операций."
					/>
				</Card>
			) : (
				<motion.ul
					layout
					className="grid gap-3 md:grid-cols-2"
				>
					<AnimatePresence
						mode="popLayout"
						initial={false}
					>
						{items.map((p) => (
							<motion.li
								key={p.id}
								layout
								variants={popIn}
								initial="hidden"
								animate="show"
								exit={{ opacity: 0, scale: 0.96, transition: tween.exit }}
							>
								<Card
									className={cn(
										"flex h-full flex-col gap-4 p-5",
										p.status === "EXCLUDED" && "opacity-70",
										p.status === "DETECTED" && "ring-1 ring-info-border"
									)}
								>
									<div className="flex items-start gap-3">
										<span
											className={cn(
												"flex size-11 shrink-0 items-center justify-center rounded-md",
												p.direction === "IN"
													? "bg-success-soft text-success-soft-foreground"
													: "bg-hero text-lime"
											)}
										>
											{p.direction === "IN" ? (
												<ArrowDownLeft className="size-5" />
											) : (
												<ArrowUpRight className="size-5" />
											)}
										</span>
										<div className="min-w-0 flex-1">
											<div className="truncate font-semibold">
												{p.counterpartyKey ?? names(p.categoryCode)}
											</div>
											<div className="truncate text-sm text-muted-foreground">
												{names(p.categoryCode)}
											</div>
										</div>
										<div className="text-right">
											<div className="font-display text-lg font-semibold whitespace-nowrap tabular-nums">
												{p.direction === "IN" ? "+" : "−"}
												{formatMoney(p.amount)}
											</div>
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted px-3 py-2 text-xs">
										<span className="flex items-center gap-1.5 font-medium">
											<CalendarDays className="size-3.5" />
											{describeSchedule(p.schedule)}
										</span>
										<span className="text-muted-foreground">
											{p.observations} {plural(p.observations, "раз", "раза", "раз")} ·{" "}
											{formatDayShort(p.firstSeen)} — {formatDayShort(p.lastSeen)}
										</span>
									</div>
									<div className="mt-auto flex flex-wrap items-center justify-between gap-2">
										<Status tone={STATUS[p.status].tone}>
											{STATUS[p.status].label}
											{p.statusSource === "USER" && p.status !== "DETECTED" ? " · вручную" : ""}
										</Status>
										{canEdit && (
											<DecideRecurringButtons
												companyId={companyId}
												accountId={accountId}
												pattern={p}
											/>
										)}
									</div>
								</Card>
							</motion.li>
						))}
					</AnimatePresence>
				</motion.ul>
			)}
		</div>
	);
};

export default RecurringPage;
