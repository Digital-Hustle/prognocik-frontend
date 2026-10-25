import { Save } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Employee, EmployeeSchedule } from "@/entities/Employee";
import { describeSchedule, useListRecurringPatternsQuery } from "@/entities/Recurring";
import { problemMessage } from "@/shared/api/problem";
import { formatMoney } from "@/shared/lib/format/money";
import { validateInn } from "@/shared/lib/validation/taxIds";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Select } from "@/shared/ui/Select/Select";
import { SwitchRow } from "@/shared/ui/Switch/Switch";
import { toast } from "@/shared/ui/Toast/Toast";
import { useLinkPaymentMutation, useSetSalaryMutation } from "../api/manageEmployeesApi";

interface Props {
	open: boolean;
	onClose: () => void;
	companyId: string;
	accountId: string;
	employee: Employee;
}

type Mode = "new" | "link";

const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const AMOUNT = /^\d{1,17}([.,]\d{1,2})?$/;

/** Ключ получателя CPK1 → поля запроса: inn:… → ИНН, name:… → имя (нормализация идемпотентна, ключ не меняется) */
function identityFromKey(key: string | null): { inn: string; name: string } {
	if (key?.startsWith("inn:")) return { inn: key.slice(4), name: "" };
	if (key?.startsWith("name:")) return { inn: "", name: key.slice(5) };
	return { inn: "", name: "" };
}

/**
 * Зарплата сотрудника. Новая: сумма + расписание + получатель «как в операциях» (ИНН приоритетнее имени).
 * Связанная: меняются сумма и расписание, реквизиты неизменны (передаём прежние, версию платежа — обязательно).
 * Альтернатива — привязать уже найденное регулярное списание: оно подтверждается от имени пользователя.
 */
export const SalaryDialog = memo(({ open, onClose, companyId, accountId, employee }: Props) => {
	const payment = employee.recurringPayment;
	const [setSalary, salaryState] = useSetSalaryMutation();
	const [link, linkState] = useLinkPaymentMutation();
	const patterns = useListRecurringPatternsQuery({ companyId, accountId }, { skip: !open || Boolean(payment) });
	const [mode, setMode] = useState<Mode>("new");
	const [amount, setAmount] = useState("");
	const [inn, setInn] = useState("");
	const [name, setName] = useState("");
	const [frequency, setFrequency] = useState<EmployeeSchedule["frequency"]>("MONTHLY");
	const [dayOfMonth, setDayOfMonth] = useState("10");
	const [weekday, setWeekday] = useState("5");
	const [following, setFollowing] = useState(true);
	const [patternId, setPatternId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const busy = salaryState.isLoading || linkState.isLoading;

	useEffect(() => {
		if (!open) return;
		setError(null);
		setMode("new");
		setPatternId("");
		const p = employee.recurringPayment;
		const id = identityFromKey(p?.counterpartyKey ?? null);
		setAmount(p ? p.amount : "");
		setInn(p ? id.inn : (employee.inn ?? ""));
		setName(p ? id.name : employee.fullName);
		setFrequency(p?.schedule.frequency ?? "MONTHLY");
		setDayOfMonth(String(p?.schedule.dayOfMonth ?? 10));
		setWeekday(String(p?.schedule.weekday ?? 5));
		setFollowing((p?.schedule.businessDayRule ?? "FOLLOWING") === "FOLLOWING");
	}, [open, employee]);

	const candidates = useMemo(
		() =>
			(patterns.data?.items ?? [])
				.filter((p) => p.direction === "OUT" && p.counterpartyKey)
				.map((p) => ({
					value: p.id,
					label: `${(p.counterpartyKey ?? "").replace(/^(inn|name):/, "")} · ${formatMoney(p.amount)} · ${describeSchedule(p.schedule)}`,
				})),
		[patterns.data]
	);
	const chosen = patterns.data?.items.find((p) => p.id === patternId);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!payment && mode === "link") {
			if (!chosen) return setError("Выберите платёж из списка");
			const rs = await link({
				companyId,
				employeeId: employee.id,
				version: employee.version,
				body: { accountId, recurringPatternId: chosen.id, patternVersion: chosen.version },
			});
			if ("error" in rs) return setError(problemMessage(rs.error));
			toast.success("Платёж привязан и подтверждён. Пересчитайте прогноз");
			return onClose();
		}
		if (!AMOUNT.test(amount.trim()) || Number(amount.replace(",", ".")) <= 0)
			return setError("Сумма — число больше нуля, не больше двух знаков после запятой");
		const cleanInn = inn.trim();
		const innError = validateInn(cleanInn, "person");
		if (innError) return setError(innError);
		if (!cleanInn && !name.trim()) return setError("Укажите ИНН или имя получателя как в банковских операциях");
		const day = Number(dayOfMonth);
		if (frequency === "MONTHLY" && !(Number.isInteger(day) && day >= 1 && day <= 31))
			return setError("День месяца — от 1 до 31");
		const schedule: EmployeeSchedule = {
			frequency,
			weekday: frequency === "WEEKLY" ? Number(weekday) : null,
			dayOfMonth: frequency === "MONTHLY" ? day : null,
			businessDayRule: following ? "FOLLOWING" : "NONE",
		};
		const rs = await setSalary({
			companyId,
			employeeId: employee.id,
			version: employee.version,
			body: {
				accountId: payment?.accountId ?? accountId,
				amount: amount.trim().replace(",", "."),
				schedule,
				...(cleanInn ? { counterpartyInn: cleanInn } : { counterpartyName: name.trim() }),
				...(payment ? { recurringPatternVersion: payment.version } : {}),
			},
		});
		if ("error" in rs) return setError(problemMessage(rs.error));
		toast.success("Зарплата сохранена и учтена в прогнозе. Пересчитайте его");
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={() => !busy && onClose()}
			title={payment ? "Изменить зарплату" : "Зарплата сотрудника"}
			description={employee.fullName}
			footer={
				<>
					<Button
						variant="ghost"
						onClick={onClose}
						disabled={busy}
					>
						Отмена
					</Button>
					<Button
						variant="brand"
						type="submit"
						form="salary-form"
						disabled={busy}
					>
						<Save />
						{busy ? "Сохраняем…" : "Сохранить"}
					</Button>
				</>
			}
		>
			<form
				id="salary-form"
				onSubmit={submit}
				className="flex flex-col gap-4"
			>
				{!payment && (
					<Segmented
						block
						value={mode}
						onChange={setMode}
						label="Способ"
						options={[
							{ value: "new", label: "Новая выплата" },
							{ value: "link", label: "Из найденных" },
						]}
					/>
				)}

				{!payment && mode === "link" ? (
					<Field
						label="Регулярное списание"
						hint="Выберите уже найденный платёж — он подтвердится от вашего имени. Сумма и расписание сохранятся."
					>
						<Select
							value={patternId}
							onChange={setPatternId}
							options={candidates}
							placeholder={patterns.isLoading ? "Загружаем…" : "Выберите платёж"}
						/>
					</Field>
				) : (
					<>
						<Field label="Сумма выплаты, ₽">
							<Input
								inputMode="decimal"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								placeholder="85000.50"
							/>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field
								label="ИНН сотрудника"
								hint={payment ? "Получатель неизменен" : "12 цифр, приоритетнее имени"}
							>
								<Input
									inputMode="numeric"
									value={inn}
									maxLength={12}
									onChange={(e) => setInn(e.target.value.replace(/\D/g, ""))}
									disabled={Boolean(payment)}
								/>
							</Field>
							<Field
								label="Имя как в операциях"
								hint="Если ИНН нет"
							>
								<Input
									value={name}
									maxLength={500}
									onChange={(e) => setName(e.target.value)}
									disabled={Boolean(payment) || Boolean(inn)}
								/>
							</Field>
						</div>
						<Segmented
							block
							value={frequency}
							onChange={setFrequency}
							label="Периодичность"
							options={[
								{ value: "MONTHLY", label: "Раз в месяц" },
								{ value: "WEEKLY", label: "Раз в неделю" },
							]}
						/>
						{frequency === "MONTHLY" ? (
							<Field
								label="День месяца"
								hint="В коротком месяце — последний день"
							>
								<Input
									inputMode="numeric"
									value={dayOfMonth}
									onChange={(e) => setDayOfMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
								/>
							</Field>
						) : (
							<Field label="День недели">
								<Select
									value={weekday}
									onChange={setWeekday}
									options={WEEKDAYS.map((d, i) => ({ value: String(i + 1), label: d }))}
								/>
							</Field>
						)}
						<SwitchRow
							title="Переносить выходные на понедельник"
							text="Государственные праздники этим правилом не учитываются"
							checked={following}
							onChange={setFollowing}
						/>
					</>
				)}

				{error && (
					<p
						role="alert"
						className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
					>
						{error}
					</p>
				)}
			</form>
		</Dialog>
	);
});
