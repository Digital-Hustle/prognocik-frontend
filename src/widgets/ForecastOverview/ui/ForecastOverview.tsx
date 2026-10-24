import { AlertTriangle, CalendarX, ShieldCheck, TrendingDown, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import { RISK_UNAVAILABLE_LABEL } from "@/entities/Forecast";
import type { Dashboard } from "@/entities/Forecast";
import { stagger } from "@/shared/config/motion";
import { diffDays, formatDay, formatDayShort } from "@/shared/lib/date/date";
import { formatMoney, toNumber } from "@/shared/lib/format/money";
import { formatProbability } from "@/shared/lib/format/percent";
import { plural } from "@/shared/lib/format/plural";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber/AnimatedNumber";
import { Stat } from "@/shared/ui/Stat/Stat";

interface ForecastOverviewProps {
	dashboard: Dashboard;
}

const money = (v: number) => formatMoney(v);

/**
 * Четыре ответа для предпринимателя: сколько есть сейчас, когда может не хватить, сколько не хватит и насколько
 * это вероятно. null-вероятность — «недостаточно данных», а не 0%.
 */
export const ForecastOverview = memo(({ dashboard }: ForecastOverviewProps) => {
	const f = dashboard.latestForecast;
	const balance = toNumber(dashboard.currentBalance?.balance);
	const minBalance = toNumber(f?.expectedMinimumBalance);
	const shortfall = toNumber(f?.maxExpectedShortfall);
	const gapDate = f?.firstExpectedGapDate ?? null;
	const risk = f?.riskEstimate;
	const riskAvailable = risk?.availability === "AVAILABLE" && risk.probability !== null;
	const daysToGap = gapDate ? diffDays(dashboard.asOfDate, gapDate) : null;

	return (
		<motion.dl
			variants={stagger(0.06)}
			initial="hidden"
			animate="show"
			className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
		>
			<Stat
				tone="hero"
				icon={<Wallet />}
				label="На счёте сейчас"
				value={
					balance === null ? (
						"—"
					) : (
						<AnimatedNumber
							value={balance}
							format={money}
						/>
					)
				}
				sub={
					dashboard.currentBalance
						? `на ${formatDay(dashboard.currentBalance.date)}`
						: "Загрузите выписку или укажите остаток"
				}
			/>
			<Stat
				tone={gapDate ? "danger" : "plain"}
				icon={gapDate ? <CalendarX /> : <ShieldCheck />}
				label={gapDate ? "Может не хватить" : "Кассовый разрыв"}
				value={gapDate ? formatDayShort(gapDate) : f ? "Не ожидается" : "—"}
				sub={
					gapDate && daysToGap !== null
						? `через ${daysToGap} ${plural(daysToGap, "день", "дня", "дней")}`
						: f
							? `на ${f.horizonDays} ${plural(f.horizonDays, "день", "дня", "дней")} вперёд`
							: "Прогноз ещё не рассчитан"
				}
			/>
			<Stat
				tone={shortfall && shortfall > 0 ? "danger" : "plain"}
				icon={<TrendingDown />}
				label={shortfall && shortfall > 0 ? "Не хватит до" : "Минимальный остаток"}
				value={
					shortfall && shortfall > 0 ? (
						<AnimatedNumber
							value={shortfall}
							format={money}
						/>
					) : minBalance !== null ? (
						<AnimatedNumber
							value={minBalance}
							format={money}
						/>
					) : (
						"—"
					)
				}
				sub={
					shortfall && shortfall > 0
						? "ожидаемая максимальная нехватка"
						: minBalance !== null
							? "самая низкая точка прогноза"
							: undefined
				}
			/>
			<Stat
				tone={riskAvailable && (risk.probability ?? 0) >= 0.3 ? "lime" : "plain"}
				icon={<AlertTriangle />}
				label="Вероятность разрыва"
				value={riskAvailable ? formatProbability(risk.probability) : "—"}
				sub={
					!risk
						? "Прогноз ещё не рассчитан"
						: !riskAvailable
							? RISK_UNAVAILABLE_LABEL[risk.availability] || "Недостаточно данных для вероятности"
							: risk.probabilityCalibrated
								? `по ${risk.scenarioCount} сценариям, откалибровано`
								: "сценарная оценка по истории"
				}
			/>
		</motion.dl>
	);
});
