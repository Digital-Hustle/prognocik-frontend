import { X } from "lucide-react";
import { useState } from "react";
import { MAX_PERIOD_DAYS } from "@/entities/Assistant";
import type { AssistantPeriod } from "@/entities/Assistant";
import { addDays, diffDays, todayIso } from "@/shared/lib/date/date";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";

const preset = (label: string, days: number, last: string) => ({
	label,
	range: { from: addDays(last, -(days - 1)), to: last },
});

/** Период вопроса. Пусто — сервер возьмёт последние 30 закрытых дней и скажет об этом в предупреждении. */
export const PeriodChip = ({
	value,
	onChange,
}: {
	value: AssistantPeriod | null;
	onChange: (v: AssistantPeriod | null) => void;
}) => {
	const [error, setError] = useState(false);
	const last = addDays(todayIso(), -1); // только закрытые дни
	const shown = value ? { from: value.fromDate, to: value.toDate } : { from: addDays(last, -29), to: last };

	return (
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<div className="min-w-0 flex-1 sm:flex-none">
				<DateRangePicker
					value={shown}
					max={last}
					onChange={(r) => {
						if (diffDays(r.from, r.to) + 1 > MAX_PERIOD_DAYS) return setError(true);
						setError(false);
						onChange({ fromDate: r.from, toDate: r.to });
					}}
					presets={[
						preset("7 дней", 7, last),
						preset("30 дней", 30, last),
						preset("90 дней", 90, last),
						preset("Год", MAX_PERIOD_DAYS, last),
					]}
					aria-label="Период вопроса"
				/>
			</div>
			{value ? (
				<button
					type="button"
					onClick={() => {
						setError(false);
						onChange(null);
					}}
					aria-label="Сбросить период"
					className="flex size-control-sm items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-surface hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			) : (
				<span className="text-xs text-muted-foreground">по умолчанию — 30 дней</span>
			)}
			{error && <span className="text-xs text-danger">Не больше {MAX_PERIOD_DAYS} дней</span>}
		</div>
	);
};
