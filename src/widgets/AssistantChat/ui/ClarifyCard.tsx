import { CalendarRange } from "lucide-react";
import { useState } from "react";
import { MAX_PERIOD_DAYS } from "@/entities/Assistant";
import type { AssistantPeriod } from "@/entities/Assistant";
import { addDays, diffDays, todayIso } from "@/shared/lib/date/date";
import { Button } from "@/shared/ui/Button/Button";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";

/** NEEDS_CLARIFICATION: сервер просит обе даты. После выбора повторяем тот же вопрос с периодом. */
export const ClarifyCard = ({
	initial,
	disabled,
	onSubmit,
}: {
	initial: AssistantPeriod | null;
	disabled: boolean;
	onSubmit: (p: AssistantPeriod) => void;
}) => {
	const last = addDays(todayIso(), -1);
	const [range, setRange] = useState({
		from: initial?.fromDate ?? addDays(last, -29),
		to: initial?.toDate ?? last,
	});
	const tooLong = diffDays(range.from, range.to) + 1 > MAX_PERIOD_DAYS;

	return (
		<div className="flex flex-col gap-2.5 rounded-md bg-muted p-3">
			<p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<CalendarRange className="size-3.5" />
				За какой период смотреть?
			</p>
			<DateRangePicker
				value={range}
				max={last}
				onChange={setRange}
				aria-label="Период для уточнения"
			/>
			{tooLong && <p className="text-xs text-danger">Не больше {MAX_PERIOD_DAYS} дней</p>}
			<Button
				size="sm"
				variant="brand"
				disabled={disabled || tooLong}
				onClick={() => onSubmit({ fromDate: range.from, toDate: range.to })}
			>
				Уточнить и спросить
			</Button>
		</div>
	);
};
