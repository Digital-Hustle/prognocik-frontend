import { Link2, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import { PLAN_SOURCE_LABEL, PLAN_STATUS_LABEL, SourceBadge, isBitrixPlan } from "@/entities/ExpectedPayment";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import { CancelPlanButton } from "@/features/EditExpectedPayment";
import { fadeUp, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { formatDay, formatDayShort, formatRelativeDays } from "@/shared/lib/date/date";
import { formatMoney, toNumber } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { Progress } from "@/shared/ui/Progress/Progress";
import { Status } from "@/shared/ui/Status/Status";

interface Props {
	plan: ExpectedPayment;
	companyId: string;
	accountId: string;
	canEdit: boolean;
	names: (code: string | null | undefined) => string;
	onEdit: (p: ExpectedPayment) => void;
	onAllocations: (p: ExpectedPayment) => void;
	/** Дату не показываем крупно, если карточка уже стоит под выбранным днём */
	compactDate?: boolean;
}

/** Карточка плана: статус, источник, прогресс оплаты, действия. Планы Битрикс24 из интерфейса не правятся. */
export const PlanCard = memo(
	({ plan: p, companyId, accountId, canEdit, names, onEdit, onAllocations, compactDate }: Props) => {
		const total = toNumber(p.amount) ?? 0;
		const settled = toNumber(p.settledAmount) ?? 0;
		const st = PLAN_STATUS_LABEL[p.status];
		const open = p.status === "OPEN" || p.status === "PARTIALLY_SETTLED";
		const bitrix = isBitrixPlan(p.sourceDocument);
		return (
			<motion.li
				layout
				variants={fadeUp}
				initial="hidden"
				animate="show"
				exit={{ opacity: 0, height: 0, transition: tween.exit }}
			>
				<Card
					className={cn(
						"flex flex-col gap-3 p-4 sm:p-5",
						!compactDate && "lg:flex-row lg:items-center lg:gap-5",
						p.overdue && "ring-1 ring-danger-border"
					)}
				>
					<div
						className={cn("flex w-full min-w-0 items-center gap-3", !compactDate && "lg:w-auto lg:flex-1")}
					>
						{!compactDate && (
							<div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-muted py-1.5">
								<span className="font-display text-lg leading-tight font-semibold">
									{p.dueDate.slice(8)}
								</span>
								<span className="text-xs text-muted-foreground">
									{formatDayShort(p.dueDate).split(" ")[1]}
								</span>
							</div>
						)}
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="truncate font-semibold">{p.title}</span>
								<Status tone={p.overdue ? "danger" : st.tone}>
									{p.overdue ? "Просрочен" : st.label}
								</Status>
								<SourceBadge doc={p.sourceDocument} />
							</div>
							<div className="truncate text-xs text-muted-foreground">
								{names(p.categoryCode)} · {PLAN_SOURCE_LABEL[p.source]}
								{p.counterpartyKey ? ` · ${p.counterpartyKey}` : ""} ·{" "}
								{open ? formatRelativeDays(p.dueDate) : formatDay(p.dueDate)}
							</div>
							{p.note && <div className="truncate text-xs text-subtle-foreground">{p.note}</div>}
						</div>
					</div>
					<div className={cn("flex w-full flex-col gap-1.5", !compactDate && "lg:w-56")}>
						<div className="flex items-baseline justify-between gap-2">
							<span
								className={cn(
									"font-display font-semibold tabular-nums",
									p.direction === "IN"
										? "text-success-soft-foreground"
										: "text-danger-soft-foreground"
								)}
							>
								{p.direction === "IN" ? "+" : "−"}
								{formatMoney(p.amount)}
							</span>
							{settled > 0 && (
								<span className="text-xs text-muted-foreground">
									оплачено {formatMoney(p.settledAmount)}
								</span>
							)}
						</div>
						<Progress
							value={total > 0 ? settled / total : 0}
							tone={p.status === "SETTLED" ? "lime" : "brand"}
						/>
					</div>
					<div className="flex shrink-0 flex-wrap gap-1">
						<Button
							size="sm"
							variant="quiet"
							onClick={() => onAllocations(p)}
						>
							<Link2 />
							Оплаты
						</Button>
						{canEdit && open && bitrix && (
							<span
								className="flex max-w-48 items-center px-2 text-xs text-muted-foreground"
								title="План создаёт синхронизация с Битрикс24. Ручные правки она перезапишет, а отмену — вернёт, пока сделка открыта."
							>
								Меняется в Битрикс24
							</span>
						)}
						{canEdit && open && !bitrix && (
							<>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => onEdit(p)}
								>
									<Pencil />
									Изменить
								</Button>
								<CancelPlanButton
									companyId={companyId}
									accountId={accountId}
									plan={p}
								/>
							</>
						)}
					</div>
				</Card>
			</motion.li>
		);
	}
);
