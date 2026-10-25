import { ArrowDownLeft, ArrowUpRight, Info, Lightbulb } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import { useGetGapDetailsQuery } from "@/entities/Forecast";
import type { PaymentFactor } from "@/entities/Forecast";
import { useCategoryNames } from "@/entities/Payment";
import { OpenAssistantButton } from "@/features/AskAssistant";
import { fadeUp, stagger } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { formatDay, formatDayShort } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { formatProbability } from "@/shared/lib/format/percent";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";

interface GapDetailsDialogProps {
	open: boolean;
	onClose: () => void;
	companyId: string;
	accountId: string;
	forecastId: string;
	gapId: string;
}

const FactorList = ({
	title,
	items,
	names,
}: {
	title: string;
	items: PaymentFactor[];
	names: (c: string | null) => string;
}) =>
	items.length === 0 ? null : (
		<section className="flex flex-col gap-2">
			<h3 className="text-sm font-semibold">{title}</h3>
			<ul className="flex flex-col gap-1">
				{items.map((f, i) => (
					<li
						key={`${f.id ?? f.title}-${i}`}
						className={cn(
							"flex items-center gap-3 rounded-md bg-muted px-3 py-2 text-sm",
							f.inGapPeriod && "ring-1 ring-danger-border"
						)}
					>
						{f.direction === "IN" ? (
							<ArrowDownLeft className="size-4 shrink-0 text-success" />
						) : (
							<ArrowUpRight className="size-4 shrink-0 text-danger" />
						)}
						<span className="min-w-0 flex-1">
							<span className="block truncate font-medium">{f.title}</span>
							<span className="block truncate text-xs text-muted-foreground">
								{formatDayShort(f.date)} · {names(f.categoryCode)} · {f.source}
							</span>
						</span>
						<span className="font-medium whitespace-nowrap tabular-nums">{formatMoney(f.amount)}</span>
					</li>
				))}
			</ul>
		</section>
	);

/** Почему возник разрыв и что можно сделать — из GapDetails бэка, ничего не додумываем */
export const GapDetailsDialog = memo(
	({ open, onClose, companyId, accountId, forecastId, gapId }: GapDetailsDialogProps) => {
		const { data, isLoading, error, refetch } = useGetGapDetailsQuery(
			{ companyId, accountId, forecastId, gapId },
			{ skip: !open }
		);
		const names = useCategoryNames(companyId);
		const g = data?.gap;

		return (
			<Dialog
				open={open}
				onClose={onClose}
				title={g?.kind === "BUFFER_BREACH" ? "Остаток ниже буфера" : "Кассовый разрыв"}
				description={g ? `${formatDay(g.fromDate)} — ${formatDay(g.toDate)}` : undefined}
				className="sm:max-w-2xl"
				footer={
					g && (
						<OpenAssistantButton
							variant="accent"
							size="md"
							question="Почему возник этот разрыв и что на него влияет?"
							context={{
								forecastId,
								gapId,
								label: `Разрыв ${formatDayShort(g.fromDate)} — ${formatDayShort(g.toDate)}`,
							}}
							onClick={onClose}
						>
							Спросить про этот разрыв
						</OpenAssistantButton>
					)
				}
			>
				{isLoading ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-20" />
						<Skeleton className="h-32" />
					</div>
				) : error || !data || !g ? (
					<ErrorState
						error={error}
						onRetry={refetch}
					/>
				) : (
					<motion.div
						variants={stagger(0.05)}
						initial="hidden"
						animate="show"
						className="flex flex-col gap-5"
					>
						<motion.div
							variants={fadeUp}
							className="grid grid-cols-2 gap-4 rounded-lg bg-hero p-4 text-hero-foreground sm:grid-cols-3"
						>
							<div>
								<div className="text-xs text-hero-muted">Не хватит</div>
								<div className="font-display text-xl font-semibold tabular-nums">
									{formatMoney(g.expectedShortfall)}
								</div>
							</div>
							<div>
								<div className="text-xs text-hero-muted">Минимум остатка</div>
								<div className="font-display text-xl font-semibold tabular-nums">
									{formatMoney(g.expectedMinimumBalance)}
								</div>
							</div>
							<div>
								<div className="text-xs text-hero-muted">Вероятность</div>
								<div className="font-display text-xl font-semibold text-lime tabular-nums">
									{g.riskEstimateAvailability === "AVAILABLE"
										? formatProbability(g.probability)
										: "—"}
								</div>
							</div>
							{(g.shortfallP50 || g.shortfallP90) && (
								<div className="col-span-full text-xs text-hero-muted">
									По сценариям: медианная нехватка {formatMoney(g.shortfallP50)}, в плохом случае
									(P90) {formatMoney(g.shortfallP90)}
								</div>
							)}
						</motion.div>

						{data.staleness === "STALE" && (
							<Status tone="warning">Данные изменились после расчёта — пересчитайте прогноз</Status>
						)}

						<motion.p
							variants={fadeUp}
							className="text-sm text-pretty"
						>
							{data.explanation}
						</motion.p>

						{data.recommendations.length > 0 && (
							<motion.section
								variants={fadeUp}
								className="flex flex-col gap-2"
							>
								<h3 className="text-sm font-semibold">Что можно сделать</h3>
								<ul className="grid gap-2 sm:grid-cols-2">
									{data.recommendations.map((r) => (
										<li
											key={r.code + r.title}
											className="flex gap-3 rounded-md bg-accent p-3 text-accent-foreground"
										>
											<Lightbulb className="mt-0.5 size-4 shrink-0" />
											<span className="min-w-0">
												<span className="block text-sm font-semibold">{r.title}</span>
												<span className="block text-xs opacity-90">{r.message}</span>
											</span>
										</li>
									))}
								</ul>
							</motion.section>
						)}

						<motion.div
							variants={fadeUp}
							className="flex flex-col gap-5"
						>
							<FactorList
								title="Обязательные списания"
								items={data.mandatoryOutflows}
								names={names}
							/>
							<FactorList
								title="Ожидаемые поступления"
								items={data.expectedInflows}
								names={names}
							/>
						</motion.div>

						{data.dataLimitations.length > 0 && (
							<motion.section
								variants={fadeUp}
								className="flex flex-col gap-1.5"
							>
								<h3 className="text-sm font-semibold">Ограничения данных</h3>
								{data.dataLimitations.map((l, i) => (
									<p
										key={l.code + i}
										className="flex gap-2 text-xs text-muted-foreground"
									>
										<Info className="mt-0.5 size-3.5 shrink-0" />
										{l.message}
									</p>
								))}
							</motion.section>
						)}
					</motion.div>
				)}
			</Dialog>
		);
	}
);
