import { ChevronLeft, ChevronRight, Landmark } from "lucide-react";
import { memo, useMemo } from "react";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, parseIsoDate, toIsoDate, todayIso } from "@/shared/lib/date/date";
import { formatCompact, toNumber } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthFmt = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });

/** Первый день месяца (YYYY-MM-01) */
export const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;

/** Сетка месяца: недели с понедельника, как привыкли в бухгалтерии */
export function monthGrid(month: string): string[] {
	const first = parseIsoDate(month);
	const offset = (first.getDay() + 6) % 7;
	const start = addDays(month, -offset);
	const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
	const lastIso = toIsoDate(last);
	const end = addDays(lastIso, 6 - ((last.getDay() + 6) % 7));
	const days: string[] = [];
	for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
	return days;
}

export const shiftMonth = (month: string, delta: number) => {
	const d = parseIsoDate(month);
	return toIsoDate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
};

interface Props {
	month: string;
	onMonth: (month: string) => void;
	plans: ExpectedPayment[];
	/** Даты налоговых сроков */
	taxDays: ReadonlySet<string>;
	selected: string | null;
	onSelect: (day: string) => void;
}

/**
 * Календарь планов. В ячейке — суммы по направлениям: зелёным ожидаемые поступления, красным платежи;
 * красная рамка — есть просроченный план. Налоговый срок отмечен значком. На телефоне вместо сумм — точки.
 */
export const PlansCalendar = memo(({ month, onMonth, plans, taxDays, selected, onSelect }: Props) => {
	const today = todayIso();
	const days = useMemo(() => monthGrid(month), [month]);
	const byDay = useMemo(() => {
		const map = new Map<string, { in: number; out: number; overdue: boolean; count: number }>();
		for (const p of plans) {
			const cell = map.get(p.dueDate) ?? { in: 0, out: 0, overdue: false, count: 0 };
			const rest = toNumber(p.status === "SETTLED" ? p.amount : p.remainingAmount) ?? 0;
			if (p.direction === "IN") cell.in += rest;
			else cell.out += rest;
			cell.overdue ||= p.overdue;
			cell.count++;
			map.set(p.dueDate, cell);
		}
		return map;
	}, [plans]);

	return (
		<Card className="p-3 sm:p-5">
			<div className="flex items-center gap-2 pb-3">
				<h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold capitalize">
					{monthFmt.format(parseIsoDate(month))}
				</h2>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => {
						onMonth(monthStart(today));
						onSelect(today);
					}}
				>
					Сегодня
				</Button>
				<Button
					size="sm"
					variant="outline"
					aria-label="Предыдущий месяц"
					onClick={() => onMonth(shiftMonth(month, -1))}
				>
					<ChevronLeft />
				</Button>
				<Button
					size="sm"
					variant="outline"
					aria-label="Следующий месяц"
					onClick={() => onMonth(shiftMonth(month, 1))}
				>
					<ChevronRight />
				</Button>
			</div>

			<div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-muted-foreground">
				{WEEKDAYS.map((w, i) => (
					<span
						key={w}
						className={cn(i > 4 && "text-subtle-foreground")}
					>
						{w}
					</span>
				))}
			</div>
			<div className="grid grid-cols-7 gap-1">
				{days.map((d) => {
					const c = byDay.get(d);
					const inMonth = d.slice(0, 7) === month.slice(0, 7);
					const weekend = (parseIsoDate(d).getDay() + 6) % 7 > 4;
					return (
						<button
							key={d}
							type="button"
							onClick={() => onSelect(d)}
							aria-label={`${d}${c ? `, планов: ${c.count}` : ""}`}
							aria-pressed={selected === d}
							className={cn(
								"relative flex min-h-14 flex-col items-stretch gap-0.5 rounded-md p-1 text-left transition-colors duration-fast outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-24 sm:p-1.5",
								inMonth ? (weekend ? "bg-muted" : "bg-surface") : "bg-transparent opacity-45",
								"hover:bg-accent",
								selected === d && "ring-2 ring-brand",
								c?.overdue && "ring-1 ring-danger-border",
								d === today && "bg-accent"
							)}
						>
							<span className="flex items-center justify-between">
								<span
									className={cn(
										"text-xs font-semibold sm:text-sm",
										d === today &&
											"flex size-5 items-center justify-center rounded-full bg-brand text-white sm:size-6"
									)}
								>
									{Number(d.slice(8))}
								</span>
								{taxDays.has(d) && (
									<Landmark
										className="size-3 text-warning-soft-foreground sm:size-3.5"
										aria-label="Налоговый срок"
									/>
								)}
							</span>
							{c && (
								<>
									<span className="mt-auto flex flex-wrap justify-center gap-0.5 sm:hidden">
										{c.in > 0 && <span className="size-1.5 rounded-full bg-success" />}
										{c.out > 0 && <span className="size-1.5 rounded-full bg-danger" />}
									</span>
									<span className="mt-auto hidden flex-col gap-0.5 sm:flex">
										{c.in > 0 && (
											<span className="truncate rounded-2xs bg-success-soft px-1 text-xs font-medium text-success-soft-foreground tabular-nums">
												+{formatCompact(c.in)}
											</span>
										)}
										{c.out > 0 && (
											<span className="truncate rounded-2xs bg-danger-soft px-1 text-xs font-medium text-danger-soft-foreground tabular-nums">
												−{formatCompact(c.out)}
											</span>
										)}
									</span>
								</>
							)}
						</button>
					);
				})}
			</div>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-success" />
					поступления
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-danger" />
					платежи
				</span>
				<span className="flex items-center gap-1.5">
					<Landmark className="size-3.5 text-warning-soft-foreground" />
					налоговый срок
				</span>
			</div>
		</Card>
	);
});
