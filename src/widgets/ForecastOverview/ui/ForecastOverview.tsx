import { AlertTriangle, CalendarX, ShieldCheck, TrendingDown, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import type { Account } from "@/entities/Company";
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
	/** Последний известный остаток счёта — если в окне dashboard нет свежих данных */
	account?: Pick<Account, "latestBalance" | "latestBalanceDate"> | null;
}

const money = (v: number) => formatMoney(v);

/** Почему нет вероятности и что с этим делать: оценка строится по ретро-прогнозам на прошлых датах */
const riskHint = (risk: { availability: string; calibrationOriginCount: number }) =>
	risk.availability === "INSUFFICIENT_HISTORY"
		? ` (проверочных прогнозов: ${risk.calibrationOriginCount}). Нужно больше истории или меньший шаг калибровки в настройках`
		: "";

/**
 * Четыре ответа для предпринимателя: сколько есть сейчас, когда может не хватить, сколько не хватит и насколько
 * это вероятно. null-вероятность — «недостаточно данных», а не 0%.
 */
export const ForecastOverview = memo(({ dashboard, account }: ForecastOverviewProps) => {
	const f = dashboard.latestForecast;
	const balance = toNumber(dashboard.currentBalance?.balance ?? account?.latestBalance);
	const balanceDate = dashboard.currentBalance?.date ?? account?.latestBalanceDate ?? null;
	const minBalance = toNumber(f?.expectedMinimumBalance);
	const shortfall = toNumber(f?.maxExpectedShortfall);
	const gapDate = f?.firstExpectedGapDate ?? null;
	const risk = f?.riskEstimate;
	const riskAvailable = risk?.availability === "AVAILABLE" && risk.probability !== null;
	const daysToGap = gapDate ? diffDays(f?.asOfDate ?? dashboard.asOfDate, gapDate) : null;

	return (
		<motion.dl
			variants={stagger(0.06)}
			initial="hidden"
			animate="show"
			className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4"
		>
			<Stat
				tone="hero"
				icon={<Wallet />}
				label={dashboard.currentBalance ? "На счёте сейчас" : "Последний остаток"}
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
				sub={balanceDate ? `на ${formatDay(balanceDate)}` : "Загрузите выписку или укажите остаток"}
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
				value={riskAvailable ? formatProbability(risk.probability) : risk ? "Нет оценки" : "—"}
				sub={
					!risk
						? "Прогноз ещё не рассчитан"
						: !riskAvailable
							? `${RISK_UNAVAILABLE_LABEL[risk.availability] || "Недостаточно данных для вероятности"}${riskHint(risk)}`
							: risk.probabilityCalibrated
								? `по ${risk.scenarioCount} сценариям, откалибровано`
								: "сценарная оценка по истории"
				}
			/>
		</motion.dl>
	);
});
