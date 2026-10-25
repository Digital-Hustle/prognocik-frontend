import { ArrowDownLeft, ArrowUpRight, CalendarClock, CalendarPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetCompanyQuery } from "@/entities/Company";
import { useListExpectedPaymentsQuery } from "@/entities/ExpectedPayment";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import { useCategoryNames } from "@/entities/Payment";
import { useGetTaxCalendarQuery } from "@/entities/TaxCalendar";
import type { TaxCalendarItem } from "@/entities/TaxCalendar";
import { useWorkspace } from "@/entities/Workspace";
import { AllocationsDialog } from "@/features/AllocatePayment";
import { PlanFormDialog } from "@/features/EditExpectedPayment";
import { stagger } from "@/shared/config/motion";
import { addDays, formatDayFull, todayIso } from "@/shared/lib/date/date";
import { formatMoney, toNumber } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";
import type { DateRange } from "@/shared/ui/DatePicker/DatePicker";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { PaymentCalendar } from "@/widgets/PaymentCalendar";
import { PlanFactPanel } from "@/widgets/PlanFactPanel";
import { PlansCalendar, monthGrid, monthStart } from "@/widgets/PlansCalendar";
import { TaxCalendar } from "@/widgets/TaxCalendar";
import { PlanCard } from "./PlanCard";

type Show = "open" | "all";
type View = "calendar" | "list" | "obligations" | "fact";

const VIEWS: View[] = ["calendar", "list", "obligations", "fact"];
const isOpen = (p: ExpectedPayment) => p.status === "OPEN" || p.status === "PARTIALLY_SETTLED";

const PlansPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const canEdit = company.data?.permissions.canManagePlans ?? false;
	const names = useCategoryNames(companyId);
	const [params, setParams] = useSearchParams();
	const view: View = VIEWS.find((v) => v === params.get("view")) ?? "calendar";
	const setView = (v: View) => setParams(v === "calendar" ? {} : { view: v }, { replace: true });

	const today = todayIso();
	const [month, setMonth] = useState(monthStart(today));
	const [selected, setSelected] = useState<string | null>(today);
	const [range, setRange] = useState<DateRange>({ from: addDays(today, -30), to: addDays(today, 60) });
	const [show, setShow] = useState<Show>("open");

	const grid = useMemo(() => monthGrid(month), [month]);
	const span = view === "calendar" ? { from: grid[0], to: grid[grid.length - 1] } : range;
	const { data, isLoading, error, refetch } = useListExpectedPaymentsQuery(
		{ companyId, accountId, from: span.from, to: span.to },
		{ skip: view === "obligations" || view === "fact" }
	);
	const tax = useGetTaxCalendarQuery({ companyId, year: Number(month.slice(0, 4)) }, { skip: view !== "calendar" });
	const taxDays = useMemo(() => new Set(tax.data?.items.map((i) => i.dueDate) ?? []), [tax.data]);

	const [editing, setEditing] = useState<ExpectedPayment | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [preset, setPreset] = useState<ComponentProps<typeof PlanFormDialog>["preset"]>();
	const [allocFor, setAllocFor] = useState<ExpectedPayment | null>(null);
	const [allocOpen, setAllocOpen] = useState(false);

	const create = useCallback((p?: ComponentProps<typeof PlanFormDialog>["preset"]) => {
		setEditing(null);
		setPreset(p);
		setFormOpen(true);
	}, []);
	const createFromTax = useCallback(
		(item: TaxCalendarItem) =>
			create({ title: item.title, dueDate: item.dueDate, direction: "OUT", source: "TAX" }),
		[create]
	);
	const edit = useCallback((p: ExpectedPayment) => {
		setEditing(p);
		setFormOpen(true);
	}, []);
	const openAlloc = useCallback((p: ExpectedPayment) => {
		setAllocFor(p);
		setAllocOpen(true);
	}, []);

	const visible = useMemo(
		() =>
			[...(data?.items ?? [])]
				.filter((p) => show === "all" || isOpen(p))
				.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
		[data, show]
	);
	const forCalendar = useMemo(() => (data?.items ?? []).filter((p) => p.status !== "CANCELLED"), [data]);
	const dayPlans = useMemo(
		() => (selected ? visible.filter((p) => p.dueDate === selected) : []),
		[visible, selected]
	);

	const totals = useMemo(() => {
		const open = (data?.items ?? []).filter(isOpen);
		const sum = (dir: "IN" | "OUT") =>
			open.filter((p) => p.direction === dir).reduce((s, p) => s + (toNumber(p.remainingAmount) ?? 0), 0);
		return { in: sum("IN"), out: sum("OUT"), overdue: open.filter((p) => p.overdue).length };
	}, [data]);

	const list = (items: ExpectedPayment[], compactDate = false) => (
		<motion.ul
			layout
			className="flex flex-col gap-2"
		>
			<AnimatePresence initial={false}>
				{items.map((p) => (
					<PlanCard
						key={p.id}
						plan={p}
						companyId={companyId}
						accountId={accountId}
						canEdit={canEdit}
						names={names}
						onEdit={edit}
						onAllocations={openAlloc}
						compactDate={compactDate}
					/>
				))}
			</AnimatePresence>
		</motion.ul>
	);

	const showStats = (view === "calendar" || view === "list") && data;

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker="Будущие обязательства и контроль"
				title="Планы и факт"
				sub="Всё, чего ещё нет в выписке: счета, налоги, «клиент обещал заплатить 20-го». Прогноз ставит планы на даты, а план-факт показывает, что из них сбылось."
				actions={
					canEdit && (view === "calendar" || view === "list") ? (
						<Button
							variant="brand"
							onClick={() => create(selected && view === "calendar" ? { dueDate: selected } : undefined)}
						>
							<CalendarPlus />
							Новый план
						</Button>
					) : undefined
				}
			/>

			<Segmented
				value={view}
				onChange={setView}
				label="Вид"
				options={[
					{ value: "calendar", label: "Календарь" },
					{ value: "list", label: "Список" },
					{ value: "obligations", label: "Обязательные платежи" },
					{ value: "fact", label: "План-факт" },
				]}
			/>

			{showStats && (
				<motion.dl
					variants={stagger(0.05)}
					initial="hidden"
					animate="show"
					className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-3"
				>
					<Stat
						label="Ожидаем поступлений"
						value={`+${formatMoney(totals.in)}`}
						icon={<ArrowDownLeft />}
					/>
					<Stat
						tone="hero"
						label="Предстоит заплатить"
						value={`−${formatMoney(totals.out)}`}
						icon={<ArrowUpRight />}
					/>
					<Stat
						tone={totals.overdue ? "danger" : "plain"}
						label="Просрочено"
						value={totals.overdue}
						icon={<CalendarClock />}
						sub={totals.overdue ? "уточните новую ожидаемую дату" : "всё в срок"}
					/>
				</motion.dl>
			)}

			{(view === "calendar" || view === "list") && (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					{view === "list" && (
						<div className="sm:w-64">
							<DateRangePicker
								value={range}
								onChange={setRange}
								presets={[
									{ label: "Ближайший месяц", range: { from: today, to: addDays(today, 30) } },
									{
										label: "−30 / +60 дней",
										range: { from: addDays(today, -30), to: addDays(today, 60) },
									},
									{ label: "Квартал вперёд", range: { from: today, to: addDays(today, 92) } },
								]}
							/>
						</div>
					)}
					<Segmented
						value={show}
						onChange={setShow}
						label="Показать"
						options={[
							{ value: "open", label: "Открытые" },
							{ value: "all", label: "Все" },
						]}
					/>
				</div>
			)}

			{(view === "calendar" || view === "list") &&
				(isLoading ? (
					<Skeleton className="h-96 rounded-xl" />
				) : error ? (
					<Card>
						<ErrorState
							error={error}
							onRetry={refetch}
						/>
					</Card>
				) : view === "calendar" ? (
					<div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-5">
						<div className="min-w-0 xl:col-span-3">
							<PlansCalendar
								month={month}
								onMonth={setMonth}
								plans={show === "open" ? forCalendar.filter(isOpen) : forCalendar}
								taxDays={taxDays}
								selected={selected}
								onSelect={setSelected}
							/>
						</div>
						<div className="flex min-w-0 flex-col gap-3 xl:col-span-2">
							<h2 className="font-display text-base font-semibold">
								{selected ? formatDayFull(selected) : "Выберите день"}
							</h2>
							{dayPlans.length === 0 ? (
								<Card>
									<EmptyState
										icon={<CalendarClock />}
										title="В этот день планов нет"
										text={canEdit ? "Нажмите «Новый план», чтобы добавить." : "Планов на дату нет."}
									/>
								</Card>
							) : (
								list(dayPlans, true)
							)}
						</div>
					</div>
				) : visible.length === 0 ? (
					<Card>
						<EmptyState
							icon={<CalendarClock />}
							title="Планов в этом периоде нет"
							text="Добавьте налог, аренду, зарплату или ожидаемую оплату — и прогноз станет точнее."
						/>
					</Card>
				) : (
					list(visible)
				))}

			{(view === "calendar" || view === "list") && (
				<TaxCalendar
					companyId={companyId}
					canCreate={canEdit}
					onCreatePlan={createFromTax}
				/>
			)}

			{view === "obligations" && (
				<PaymentCalendar
					companyId={companyId}
					accountId={accountId}
					names={names}
				/>
			)}
			{view === "fact" && (
				<PlanFactPanel
					companyId={companyId}
					accountId={accountId}
				/>
			)}

			<PlanFormDialog
				open={formOpen}
				onClose={() => setFormOpen(false)}
				companyId={companyId}
				accountId={accountId}
				plan={editing}
				preset={preset}
			/>
			{allocFor && (
				<AllocationsDialog
					open={allocOpen}
					onClose={() => setAllocOpen(false)}
					companyId={companyId}
					accountId={accountId}
					plan={data?.items.find((x) => x.id === allocFor.id) ?? allocFor}
					canEdit={canEdit}
				/>
			)}
		</div>
	);
};

export default PlansPage;
