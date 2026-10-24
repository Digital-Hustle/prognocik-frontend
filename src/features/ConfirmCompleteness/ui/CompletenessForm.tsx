import { CalendarCheck } from "lucide-react";
import { memo, useState } from "react";
import type { FormEvent } from "react";
import type { Completeness } from "@/entities/AccountHistory";
import { problemMessage } from "@/shared/api/problem";
import { addDays, todayIso } from "@/shared/lib/date/date";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { DateRangePicker } from "@/shared/ui/DatePicker/DatePicker";
import type { DateRange } from "@/shared/ui/DatePicker/DatePicker";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { toast } from "@/shared/ui/Toast/Toast";
import { useSetCompletenessMutation } from "../api/completenessApi";

interface CompletenessFormProps {
	companyId: string;
	accountId: string;
	disabled?: boolean;
	/** Предзаполнить период (например, из отмеченного пропуска) */
	initialRange?: DateRange;
	onDone?: () => void;
}

/**
 * Явное подтверждение полноты. Пустые дни не считаются полными автоматически: UNKNOWN — безопасное значение,
 * CONFIRMED_COMPLETE — осознанное действие, влияющее на прогноз.
 */
export const CompletenessForm = memo(
	({ companyId, accountId, disabled, initialRange, onDone }: CompletenessFormProps) => {
		const [setCompleteness, state] = useSetCompletenessMutation();
		const idem = useIdempotencyKey();
		const [range, setRange] = useState<DateRange>(
			initialRange ?? { from: addDays(todayIso(), -30), to: addDays(todayIso(), -1) }
		);
		const [completeness, setValue] = useState<Completeness>("CONFIRMED_COMPLETE");
		const [reason, setReason] = useState("Полная банковская выписка за период");

		const onSubmit = async (e: FormEvent) => {
			e.preventDefault();
			if (!reason.trim()) {
				toast.error("Укажите основание");
				return;
			}
			const body = { fromDate: range.from, toDate: range.to, completeness, reason: reason.trim() };
			const rs = await setCompleteness({ companyId, accountId, body, idempotencyKey: idem.get(body) });
			if ("error" in rs) toast.error(problemMessage(rs.error));
			else {
				idem.done();
				toast.success("Период отмечен");
				onDone?.();
			}
		};

		return (
			<form
				onSubmit={onSubmit}
				className="flex flex-col gap-4"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Период">
						<DateRangePicker
							value={range}
							onChange={setRange}
							max={todayIso()}
						/>
					</Field>
					<div className="flex flex-col gap-1.5">
						<span className="text-sm font-medium">Статус</span>
						<Segmented
							block
							value={completeness}
							onChange={setValue}
							label="Полнота"
							options={[
								{ value: "CONFIRMED_COMPLETE", label: "Данные полные" },
								{ value: "UNKNOWN", label: "Неизвестно" },
							]}
						/>
					</div>
				</div>
				<Field label="Основание">
					<Input
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						maxLength={500}
					/>
				</Field>
				<Button
					type="submit"
					className="self-end"
					disabled={disabled || state.isLoading}
				>
					<CalendarCheck />
					Отметить период
				</Button>
			</form>
		);
	}
);
