import { AlertTriangle, CalendarClock, ChevronRight, DatabaseZap, ShieldAlert, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useState } from "react";
import { Link } from "react-router-dom";
import type { Alert, AlertCode } from "@/entities/Forecast";
import { AcknowledgeAlertButton } from "@/features/AcknowledgeAlert";
import { fadeUp, spring, tween } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { cn } from "@/shared/lib/cn/cn";
import { formatDay } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { formatProbability } from "@/shared/lib/format/percent";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { Status } from "@/shared/ui/Status/Status";
import { GapDetailsDialog } from "./GapDetailsDialog";

const META: Record<AlertCode, { icon: typeof AlertTriangle; tone: string; label: string }> = {
	CASH_GAP: { icon: ShieldAlert, tone: "bg-danger-soft text-danger-soft-foreground", label: "Разрыв" },
	BUFFER_BREACH: { icon: AlertTriangle, tone: "bg-warning-soft text-warning-soft-foreground", label: "Ниже буфера" },
	OVERDUE_PLAN: { icon: CalendarClock, tone: "bg-info-soft text-info-soft-foreground", label: "Просрочено" },
	DATA_QUALITY: { icon: DatabaseZap, tone: "bg-surface text-muted-foreground", label: "Данные" },
};

interface AlertsPanelProps {
	companyId: string;
	accountId: string;
	alerts: Alert[];
	canWrite: boolean;
	className?: string;
}

/** Список предупреждений: когда, сколько и насколько вероятно; клик по разрыву — объяснение и действия */
export const AlertsPanel = memo(({ companyId, accountId, alerts, canWrite, className }: AlertsPanelProps) => {
	const [gap, setGap] = useState<{ forecastId: string; gapId: string } | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	return (
		<Card className={cn("flex flex-col", className)}>
			<CardHeader>
				<CardTitle>Предупреждения</CardTitle>
				{alerts.length > 0 && <Status tone="danger">{alerts.length}</Status>}
			</CardHeader>
			{alerts.length === 0 ? (
				<EmptyState
					icon={<ShieldCheck />}
					title="Всё спокойно"
					text="Активных предупреждений нет. Мы сообщим, если остаток может уйти ниже нуля или буфера."
				/>
			) : (
				<ul className="flex flex-col gap-1.5 p-2 sm:p-3">
					<AnimatePresence initial={false}>
						{alerts.map((a) => {
							const meta = META[a.code] ?? META.DATA_QUALITY;
							const Icon = meta.icon;
							const explainable = Boolean(a.gapId && a.forecastId);
							return (
								<motion.li
									key={a.id}
									layout
									variants={fadeUp}
									initial="hidden"
									animate="show"
									exit={{ opacity: 0, x: 24, transition: tween.exit }}
								>
									<motion.div
										whileHover={explainable ? { y: -3 } : undefined}
										whileTap={explainable ? { scale: 0.98 } : undefined}
										transition={spring.hover}
										role={explainable ? "button" : undefined}
										tabIndex={explainable ? 0 : undefined}
										onClick={() => {
											if (!explainable) return;
											setGap({ forecastId: a.forecastId!, gapId: a.gapId! });
											setDialogOpen(true);
										}}
										onKeyDown={(e) => {
											if (explainable && (e.key === "Enter" || e.key === " ")) {
												e.preventDefault();
												setGap({ forecastId: a.forecastId!, gapId: a.gapId! });
												setDialogOpen(true);
											}
										}}
										className={cn(
											"flex items-start gap-3 rounded-md bg-muted p-3 outline-none",
											explainable &&
												"cursor-pointer hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
										)}
									>
										<span
											className={cn(
												"flex size-9 shrink-0 items-center justify-center rounded-sm",
												meta.tone
											)}
										>
											<Icon className="size-4.5" />
										</span>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-sm font-semibold">{a.title}</span>
												{a.staleness === "STALE" && <Status tone="warning">устарело</Status>}
											</div>
											<p className="mt-0.5 text-xs text-pretty text-muted-foreground">
												{a.message}
											</p>
											<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
												{a.fromDate && (
													<span className="font-medium">
														{formatDay(a.fromDate)}
														{a.toDate && a.toDate !== a.fromDate
															? ` — ${formatDay(a.toDate)}`
															: ""}
													</span>
												)}
												{a.amount && (
													<span className="font-semibold text-danger tabular-nums">
														{a.code === "OVERDUE_PLAN" ? "" : "−"}
														{formatMoney(a.amount)}
													</span>
												)}
												{a.probability !== null && (
													<span className="text-muted-foreground">
														вероятность {formatProbability(a.probability)}
													</span>
												)}
											</div>
										</div>
										<div className="flex shrink-0 flex-col items-end gap-1">
											{canWrite && (
												<AcknowledgeAlertButton
													companyId={companyId}
													accountId={accountId}
													alertId={a.id}
												/>
											)}
											{explainable && (
												<span className="flex items-center text-xs font-medium text-accent-foreground">
													Почему
													<ChevronRight className="size-3.5" />
												</span>
											)}
											{a.code === "OVERDUE_PLAN" && (
												<Link
													to={RoutePath.plans}
													onClick={(e) => e.stopPropagation()}
													className="flex items-center text-xs font-medium text-accent-foreground"
												>
													К планам
													<ChevronRight className="size-3.5" />
												</Link>
											)}
										</div>
									</motion.div>
								</motion.li>
							);
						})}
					</AnimatePresence>
				</ul>
			)}
			{gap && (
				<GapDetailsDialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					companyId={companyId}
					accountId={accountId}
					forecastId={gap.forecastId}
					gapId={gap.gapId}
				/>
			)}
		</Card>
	);
});
