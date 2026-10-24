import { ArrowDownLeft, ArrowUpRight, CalendarPlus } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import type { Dashboard } from "@/entities/Forecast";
import { fadeUp, stagger } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { formatDayShort, formatRelativeDays } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";

interface UpcomingPaymentsProps {
	items: Dashboard["upcomingPayments"];
	asOfDate: string;
	onAdd?: () => void;
	className?: string;
}

/** Ближайшие обязательства и ожидаемые поступления (неоплаченный остаток плана) */
export const UpcomingPayments = memo(({ items, asOfDate, onAdd, className }: UpcomingPaymentsProps) => (
	<Card className={cn("flex flex-col", className)}>
		<CardHeader>
			<CardTitle>Ближайшие платежи</CardTitle>
			{onAdd && (
				<Button
					size="sm"
					variant="quiet"
					onClick={onAdd}
				>
					<CalendarPlus />
					Добавить
				</Button>
			)}
		</CardHeader>
		{items.length === 0 ? (
			<EmptyState
				icon={<CalendarPlus />}
				title="Планов нет"
				text="Добавьте налоги, аренду, зарплату или обещанные оплаты клиентов — они войдут в прогноз."
			/>
		) : (
			<motion.ul
				variants={stagger(0.04)}
				initial="hidden"
				animate="show"
				className="flex flex-col p-2 sm:p-3"
			>
				{items.map((p) => (
					<motion.li
						key={p.id}
						variants={fadeUp}
						className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-muted"
					>
						<span
							className={cn(
								"flex size-9 shrink-0 items-center justify-center rounded-sm",
								p.direction === "IN"
									? "bg-success-soft text-success-soft-foreground"
									: "bg-surface text-foreground"
							)}
						>
							{p.direction === "IN" ? (
								<ArrowDownLeft className="size-4" />
							) : (
								<ArrowUpRight className="size-4" />
							)}
						</span>
						<div className="min-w-0 flex-1">
							<div className="truncate text-sm font-medium">{p.title}</div>
							<div
								className={cn(
									"text-xs",
									p.dueDate < asOfDate ? "text-danger" : "text-muted-foreground"
								)}
							>
								{formatDayShort(p.dueDate)} ·{" "}
								{p.dueDate < asOfDate ? "просрочен" : formatRelativeDays(p.dueDate)}
							</div>
						</div>
						<span
							className={cn(
								"text-sm font-semibold whitespace-nowrap tabular-nums",
								p.direction === "IN" && "text-success-soft-foreground"
							)}
						>
							{p.direction === "IN" ? "+" : "−"}
							{formatMoney(p.remainingAmount)}
						</span>
					</motion.li>
				))}
			</motion.ul>
		)}
	</Card>
));
