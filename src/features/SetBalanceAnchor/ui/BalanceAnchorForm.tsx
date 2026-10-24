import { Anchor } from "lucide-react";
import { memo, useState } from "react";
import type { FormEvent } from "react";
import { problemMessage } from "@/shared/api/problem";
import { addDays, todayIso } from "@/shared/lib/date/date";
import { toMoneyString } from "@/shared/lib/format/money";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { DatePicker } from "@/shared/ui/DatePicker/DatePicker";
import { Field, Input } from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateBalanceAnchorMutation } from "../api/anchorApi";

interface BalanceAnchorFormProps {
	companyId: string;
	accountId: string;
	disabled?: boolean;
	onDone?: () => void;
}

/** Подтверждённый остаток на дату — опора прогноза, когда в выписке нет остатка на конец дня */
export const BalanceAnchorForm = memo(({ companyId, accountId, disabled, onDone }: BalanceAnchorFormProps) => {
	const [create, state] = useCreateBalanceAnchorMutation();
	const idem = useIdempotencyKey();
	const [date, setDate] = useState(addDays(todayIso(), -1));
	const [balance, setBalance] = useState("");
	const [reason, setReason] = useState("Остаток по данным банка");

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const value = Number(balance.replace(/\s/g, "").replace(",", "."));
		if (!Number.isFinite(value) || balance.trim() === "") {
			toast.error("Укажите остаток");
			return;
		}
		const body = {
			date,
			balance: toMoneyString(value),
			reason: reason.trim() || "Ручной ввод",
			supersedesId: null,
		};
		const rs = await create({ companyId, accountId, body, idempotencyKey: idem.get(body) });
		if ("error" in rs) toast.error(problemMessage(rs.error));
		else {
			idem.done();
			setBalance("");
			toast.success("Остаток зафиксирован");
			onDone?.();
		}
	};

	return (
		<form
			onSubmit={onSubmit}
			className="flex flex-col gap-4"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="На конец дня">
					<DatePicker
						value={date}
						max={todayIso()}
						onChange={setDate}
					/>
				</Field>
				<Field label="Остаток, ₽">
					<Input
						inputMode="decimal"
						value={balance}
						onChange={(e) => setBalance(e.target.value.replace(/[^\d.,\s-]/g, ""))}
						placeholder="1 250 000"
					/>
				</Field>
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
				<Anchor />
				Зафиксировать остаток
			</Button>
		</form>
	);
});
