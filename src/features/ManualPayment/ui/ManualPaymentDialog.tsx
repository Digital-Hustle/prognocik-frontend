import { ArrowDownLeft, ArrowUpRight, Save } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useListCategoriesQuery } from "@/entities/Payment";
import { problemMessage, toProblem } from "@/shared/api/problem";
import type { Direction } from "@/shared/api/types";
import { addDays, todayIso } from "@/shared/lib/date/date";
import { toMoneyString } from "@/shared/lib/format/money";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { validateInn } from "@/shared/lib/validation/taxIds";
import { Button } from "@/shared/ui/Button/Button";
import { DatePicker } from "@/shared/ui/DatePicker/DatePicker";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Select } from "@/shared/ui/Select/Select";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateManualPaymentMutation } from "../api/manualPaymentApi";
import type { ManualPaymentRq } from "../api/manualPaymentApi";

interface ManualPaymentDialogProps {
	open: boolean;
	onClose: () => void;
	companyId: string;
	accountId: string;
	/** Последний закрытый день: ручной факт принимается только за закрытый день компании */
	maxDate?: string;
}

const parseAmount = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
const NO_CATEGORY = "";

/**
 * Ручная операция, которой нет в выписке. Только за закрытый день, который ещё не подтверждён полным выпиской;
 * остаток на конец дня не передаётся — ручной факт не переписывает якорь выписки.
 */
export const ManualPaymentDialog = memo(
	({ open, onClose, companyId, accountId, maxDate }: ManualPaymentDialogProps) => {
		const [create, state] = useCreateManualPaymentMutation();
		const idem = useIdempotencyKey();
		const categories = useListCategoriesQuery(companyId, { skip: !companyId || !open });
		const lastClosed = maxDate ?? addDays(todayIso(), -1);

		const [direction, setDirection] = useState<Direction>("OUT");
		const [amount, setAmount] = useState("");
		const [date, setDate] = useState(lastClosed);
		const [categoryCode, setCategoryCode] = useState(NO_CATEGORY);
		const [name, setName] = useState("");
		const [inn, setInn] = useState("");
		const [purpose, setPurpose] = useState("");
		const [note, setNote] = useState("");
		const [errors, setErrors] = useState<Record<string, string>>({});

		useEffect(() => {
			if (!open) return;
			setErrors({});
			setDirection("OUT");
			setAmount("");
			setDate(lastClosed);
			setCategoryCode(NO_CATEGORY);
			setName("");
			setInn("");
			setPurpose("");
			setNote("");
		}, [open, lastClosed]);

		const categoryOptions = useMemo(
			() => [
				{ value: NO_CATEGORY, label: "Определить автоматически" },
				...(categories.data?.items ?? [])
					.filter((c) => c.directions.length === 0 || c.directions.includes(direction))
					.map((c) => ({ value: c.code, label: c.name })),
			],
			[categories.data, direction]
		);

		const onSubmit = async (e: FormEvent) => {
			e.preventDefault();
			const next: Record<string, string> = {};
			const value = parseAmount(amount);
			if (!Number.isFinite(value) || value <= 0) next.amount = "Сумма больше нуля";
			else if (!/^\d+([.,]\d{1,2})?$/.test(amount.replace(/\s/g, "")))
				next.amount = "Не больше двух знаков после запятой";
			if (date > lastClosed) next.operationDate = "Только за закрытый день — не позже вчерашнего";
			const innError = validateInn(inn);
			if (innError) next.counterpartyInn = innError;
			setErrors(next);
			if (Object.keys(next).length) return;

			const body: ManualPaymentRq = {
				accountId,
				operationDate: date,
				amount: toMoneyString(value),
				direction,
				counterpartyInn: inn || null,
				counterpartyName: name.trim() || null,
				purpose: purpose.trim() || null,
				categoryCode: categoryCode || null,
				note: note.trim() || null,
			};
			const rs = await create({ companyId, body, idempotencyKey: idem.get(body) });
			if ("data" in rs && rs.data) {
				idem.done();
				toast.success("Операция добавлена — прогноз пересчитается");
				onClose();
			} else {
				const p = toProblem(rs.error);
				if (p.errors.length) setErrors(Object.fromEntries(p.errors.map((x) => [x.field, x.message])));
				toast.error(problemMessage(rs.error));
			}
		};

		return (
			<Dialog
				open={open}
				onClose={onClose}
				title="Добавить операцию вручную"
				description="Платёж, которого нет в выписке. Только за прошедший день, который ещё не подтверждён как полный."
				footer={
					<>
						<Button
							variant="ghost"
							onClick={onClose}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							form="manual-payment-form"
							variant="brand"
							disabled={state.isLoading}
						>
							<Save />
							Добавить операцию
						</Button>
					</>
				}
			>
				<form
					id="manual-payment-form"
					onSubmit={onSubmit}
					className="flex flex-col gap-4"
					noValidate
				>
					<Segmented
						block
						value={direction}
						onChange={(d) => {
							setDirection(d);
							setCategoryCode(NO_CATEGORY);
						}}
						label="Направление"
						options={[
							{ value: "OUT", label: "Списание", icon: <ArrowUpRight /> },
							{ value: "IN", label: "Поступление", icon: <ArrowDownLeft /> },
						]}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field
							label="Сумма, ₽"
							error={errors.amount}
						>
							<Input
								inputMode="decimal"
								value={amount}
								onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ""))}
								placeholder="1 500,00"
							/>
						</Field>
						<Field
							label="Дата операции"
							error={errors.operationDate}
						>
							<DatePicker
								value={date}
								onChange={setDate}
								max={lastClosed}
							/>
						</Field>
					</div>
					<Field
						label="Категория"
						error={errors.categoryCode}
					>
						<Select
							value={categoryCode}
							onChange={setCategoryCode}
							options={categoryOptions}
						/>
					</Field>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Контрагент">
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Название"
								maxLength={500}
							/>
						</Field>
						<Field
							label="ИНН"
							error={errors.counterpartyInn}
						>
							<Input
								inputMode="numeric"
								value={inn}
								onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 12))}
								placeholder="10 или 12 цифр"
							/>
						</Field>
					</div>
					<Field label="Назначение">
						<Input
							value={purpose}
							onChange={(e) => setPurpose(e.target.value)}
							placeholder="Оплата услуги"
							maxLength={2000}
						/>
					</Field>
					<Field label="Комментарий">
						<Input
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="Добавлено вручную"
							maxLength={500}
						/>
					</Field>
				</form>
			</Dialog>
		);
	}
);
