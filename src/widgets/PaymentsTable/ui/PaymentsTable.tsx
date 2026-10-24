import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ScrollText, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useState } from "react";
import { CATEGORY_SOURCE_LABEL, DirectionAmount, useCategoryNames, useListPaymentsQuery } from "@/entities/Payment";
import type { Payment } from "@/entities/Payment";
import { BulkCategoryBar, CategorySelect, PaymentCategoryCell } from "@/features/ChangePaymentCategory";
import type { Direction } from "@/shared/api/types";
import { fadeUp, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, formatDayShort, todayIso } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { plural } from "@/shared/lib/format/plural";
import { useDebounce } from "@/shared/lib/hooks/useDebounce/useDebounce";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";
import type { DateRange } from "@/shared/ui/DatePicker/DatePicker";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";

interface PaymentsTableProps {
	companyId: string;
	accountId: string;
	canEdit: boolean;
}

const PAGE = 50;

const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		aria-label={label}
		onClick={onChange}
		className={cn(
			"flex size-5 shrink-0 items-center justify-center rounded-2xs border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
			checked ? "border-brand bg-brand text-white" : "border-border-strong bg-card"
		)}
	>
		<AnimatePresence>
			{checked && (
				<motion.svg
					viewBox="0 0 24 24"
					className="size-3.5"
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					exit={{ scale: 0 }}
				>
					<motion.path
						d="M5 12.5l4.5 4.5L19 7.5"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
						initial={{ pathLength: 0 }}
						animate={{ pathLength: 1 }}
						transition={tween.draw}
					/>
				</motion.svg>
			)}
		</AnimatePresence>
	</button>
);

export const PaymentsTable = memo(({ companyId, accountId, canEdit }: PaymentsTableProps) => {
	const [range, setRange] = useState<DateRange>({ from: addDays(todayIso(), -90), to: todayIso() });
	const [direction, setDirection] = useState<"" | Direction>("");
	const [category, setCategory] = useState("");
	const [q, setQ] = useState("");
	const query = useDebounce(q, 350);
	const [page, setPage] = useState(0);
	const [selected, setSelected] = useState<Map<string, Payment>>(new Map());
	const names = useCategoryNames(companyId);

	useEffect(() => setPage(0), [range, direction, category, query]);

	const { data, isFetching, isLoading, error, refetch } = useListPaymentsQuery({
		companyId,
		accountId,
		fromDate: range.from,
		toDate: range.to,
		direction: direction || undefined,
		categoryCode: category || undefined,
		q: query || undefined,
		page,
		size: PAGE,
	});

	const items = useMemo(() => data?.items ?? [], [data]);
	const totals = useMemo(
		() =>
			items.reduce(
				(acc, p) => {
					const v = Number(p.amount) || 0;
					if (p.status === "VOIDED") return acc;
					if (p.direction === "IN") acc.in += v;
					else acc.out += v;
					return acc;
				},
				{ in: 0, out: 0 }
			),
		[items]
	);

	const toggle = (p: Payment) =>
		setSelected((prev) => {
			const next = new Map(prev);
			if (next.has(p.id)) next.delete(p.id);
			else next.set(p.id, p);
			return next;
		});
	const allOnPage = items.length > 0 && items.every((p) => selected.has(p.id));

	return (
		<>
			<Card>
				<div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center">
					<div className="lg:w-64">
						<DateRangePicker
							value={range}
							onChange={setRange}
							max={todayIso()}
							presets={[
								{ label: "30 дней", range: { from: addDays(todayIso(), -30), to: todayIso() } },
								{ label: "90 дней", range: { from: addDays(todayIso(), -90), to: todayIso() } },
								{ label: "Полгода", range: { from: addDays(todayIso(), -182), to: todayIso() } },
								{ label: "Год", range: { from: addDays(todayIso(), -365), to: todayIso() } },
								{ label: "2 года", range: { from: addDays(todayIso(), -730), to: todayIso() } },
							]}
						/>
					</div>
					<Segmented
						value={direction}
						onChange={setDirection}
						label="Направление"
						options={[
							{ value: "", label: "Все" },
							{ value: "IN", label: "Поступления", icon: <ArrowDownLeft /> },
							{ value: "OUT", label: "Списания", icon: <ArrowUpRight /> },
						]}
					/>
					<div className="lg:w-56">
						<CategorySelect
							companyId={companyId}
							value={category}
							onChange={setCategory}
							direction={direction || undefined}
							size="md"
							placeholder="Все категории"
						/>
					</div>
					<div className="min-w-0 flex-1">
						<Input
							icon={<Search />}
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Контрагент, ИНН или назначение"
						/>
					</div>
					{category && (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setCategory("")}
						>
							Сбросить
						</Button>
					)}
				</div>

				<div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
					<span>
						{data
							? `${data.page.total} ${plural(data.page.total, "операция", "операции", "операций")}`
							: "…"}
					</span>
					<span>
						На странице:{" "}
						<span className="font-medium text-success-soft-foreground">+{formatMoney(totals.in)}</span> /{" "}
						<span className="font-medium text-foreground">−{formatMoney(totals.out)}</span>
					</span>
					{isFetching && !isLoading && <span>обновляем…</span>}
				</div>

				{isLoading ? (
					<div className="flex flex-col gap-2 p-4">
						{Array.from({ length: 6 }, (_, i) => (
							<Skeleton
								key={i}
								className="h-12"
							/>
						))}
					</div>
				) : error ? (
					<ErrorState
						error={error}
						onRetry={refetch}
					/>
				) : items.length === 0 ? (
					<EmptyState
						icon={<ScrollText />}
						title="Операций не найдено"
						text="Измените период или фильтры. Если выписка ещё не загружена — начните с раздела «Выписки»."
					/>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[760px] text-sm">
							<thead>
								<tr className="border-y border-border text-left text-xs text-muted-foreground">
									{canEdit && (
										<th className="w-10 py-2.5 pl-4 sm:pl-5">
											<Checkbox
												checked={allOnPage}
												label="Выбрать все на странице"
												onChange={() =>
													setSelected((prev) => {
														const next = new Map(prev);
														if (allOnPage) items.forEach((p) => next.delete(p.id));
														else
															items.forEach(
																(p) => p.status === "ACTIVE" && next.set(p.id, p)
															);
														return next;
													})
												}
											/>
										</th>
									)}
									<th className="px-3 py-2.5 font-medium">Дата</th>
									<th className="px-3 py-2.5 font-medium">Контрагент и назначение</th>
									<th className="w-60 px-3 py-2.5 font-medium">Категория</th>
									<th className="px-3 py-2.5 text-right font-medium">Сумма</th>
									<th className="px-3 py-2.5 pr-4 text-right font-medium sm:pr-5">Остаток</th>
								</tr>
							</thead>
							<motion.tbody
								key={`${page}-${range.from}-${range.to}-${direction}-${category}-${query}`}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={tween.base}
							>
								{items.map((p) => (
									<tr
										key={p.id}
										className={cn(
											"border-b border-border transition-colors last:border-0 hover:bg-muted",
											selected.has(p.id) && "bg-accent",
											p.status === "VOIDED" && "opacity-50"
										)}
									>
										{canEdit && (
											<td className="py-2.5 pl-4 sm:pl-5">
												{p.status === "ACTIVE" && (
													<Checkbox
														checked={selected.has(p.id)}
														label="Выбрать операцию"
														onChange={() => toggle(p)}
													/>
												)}
											</td>
										)}
										<td className="px-3 py-2.5 whitespace-nowrap">
											<div>{formatDayShort(p.operationDate)}</div>
											{p.dayStatus === "MISSING" && (
												<span className="text-xs text-warning">день неполный</span>
											)}
										</td>
										<td className="max-w-md px-3 py-2.5">
											<div className="truncate font-medium">
												{p.counterpartyName ?? "Без контрагента"}
											</div>
											<div className="truncate text-xs text-muted-foreground">
												{p.counterpartyInn ? `ИНН ${p.counterpartyInn} · ` : ""}
												{p.purpose ?? "—"}
											</div>
										</td>
										<td className="px-3 py-2">
											{canEdit ? (
												<PaymentCategoryCell
													companyId={companyId}
													accountId={accountId}
													payment={p}
												/>
											) : (
												<span>{names(p.categoryCode)}</span>
											)}
											<div className="mt-0.5 text-[11px] text-subtle-foreground">
												{CATEGORY_SOURCE_LABEL[p.categorySource] ?? p.categorySource}
												{p.source === "MANUAL" ? " · ручная операция" : ""}
											</div>
										</td>
										<td className="px-3 py-2.5 text-right">
											<DirectionAmount
												amount={p.amount}
												direction={p.direction}
											/>
											{p.status === "VOIDED" && (
												<div>
													<Status tone="neutral">аннулирована</Status>
												</div>
											)}
										</td>
										<td className="px-3 py-2.5 pr-4 text-right whitespace-nowrap text-muted-foreground tabular-nums sm:pr-5">
											{p.balanceEod !== null ? formatMoney(p.balanceEod) : "—"}
										</td>
									</tr>
								))}
							</motion.tbody>
						</table>
					</div>
				)}

				{data && (data.page.hasNext || page > 0) && (
					<motion.div
						variants={fadeUp}
						initial="hidden"
						animate="show"
						className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5"
					>
						<Button
							size="sm"
							variant="outline"
							disabled={page === 0 || isFetching}
							onClick={() => setPage((p) => p - 1)}
						>
							<ChevronLeft />
							Назад
						</Button>
						<span className="text-xs text-muted-foreground">
							Страница {page + 1} из {Math.max(1, Math.ceil(data.page.total / PAGE))}
						</span>
						<Button
							size="sm"
							variant="outline"
							disabled={!data.page.hasNext || isFetching}
							onClick={() => setPage((p) => p + 1)}
						>
							Дальше
							<ChevronRight />
						</Button>
					</motion.div>
				)}
			</Card>

			{canEdit && (
				<BulkCategoryBar
					companyId={companyId}
					accountId={accountId}
					selected={[...selected.values()]}
					onClear={() => setSelected(new Map())}
				/>
			)}
		</>
	);
});
