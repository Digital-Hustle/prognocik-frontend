import { ArrowDownLeft, ArrowUpRight, Save } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PLAN_RELATION_LABEL } from "@/entities/ExpectedPayment";
import type { ExpectedPayment, PlanRelation, PlanRq } from "@/entities/ExpectedPayment";
import { useListCategoriesQuery } from "@/entities/Payment";
import { describeSchedule, useListRecurringPatternsQuery } from "@/entities/Recurring";
import { problemMessage, toProblem } from "@/shared/api/problem";
import type { Direction } from "@/shared/api/types";
import { spring, tween } from "@/shared/config/motion";
import { addDays, todayIso } from "@/shared/lib/date/date";
import { formatMoney, toMoneyString } from "@/shared/lib/format/money";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { DatePicker } from "@/shared/ui/DatePicker/DatePicker";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { Select } from "@/shared/ui/Select/Select";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateExpectedPaymentMutation, useUpdateExpectedPaymentMutation } from "../api/editPlanApi";

interface PlanFormDialogProps {
	open: boolean;
	onClose: () => void;
	companyId: string;
	accountId: string;
	/** Редактирование существующего плана; без него — создание */
	plan?: ExpectedPayment | null;
	/** Предзаполнение (например, из сценария «что если») */
	preset?: Partial<Pick<PlanRq, "title" | "direction" | "amount" | "dueDate" | "categoryCode" | "note" | "source">>;
}

const parseAmount = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

/**
 * Ручной план: «клиент обещал заплатить 300 000 ₽ 20-го», «в декабре налог». source=MANUAL; relation
 * не даёт посчитать один поток дважды (REPLACES_RECURRING — вместо конкретной регулярности).
 */
export const PlanFormDialog = memo(({ open, onClose, companyId, accountId, plan, preset }: PlanFormDialogProps) => {
	const editing = Boolean(plan);
	const [create, createState] = useCreateExpectedPaymentMutation();
	const [update, updateState] = useUpdateExpectedPaymentMutation();
	const idem = useIdempotencyKey();
	const categories = useListCategoriesQuery(companyId, { skip: !companyId || !open });
	const recurring = useListRecurringPatternsQuery({ companyId, accountId }, { skip: !open });

	const [title, setTitle] = useState("");
	const [direction, setDirection] = useState<Direction>("OUT");
	const [amount, setAmount] = useState("");
	const [dueDate, setDueDate] = useState(addDays(todayIso(), 7));
	const [categoryCode, setCategoryCode] = useState("");
	const [counterpartyKey, setCounterpartyKey] = useState("");
	const [note, setNote] = useState("");
	const [relation, setRelation] = useState<PlanRelation>("ADDITIONAL");
	const [recurringPatternId, setRecurringPatternId] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (!open) return;
		setErrors({});
		setTitle(plan?.title ?? preset?.title ?? "");
		setDirection(plan?.direction ?? preset?.direction ?? "OUT");
		setAmount(plan?.amount ?? preset?.amount ?? "");
		setDueDate(plan?.dueDate ?? preset?.dueDate ?? addDays(todayIso(), 7));
		setCategoryCode(plan?.categoryCode ?? preset?.categoryCode ?? "");
		setCounterpartyKey(plan?.counterpartyKey ?? "");
		setNote(plan?.note ?? preset?.note ?? "");
		setRelation(plan?.relation ?? "ADDITIONAL");
		setRecurringPatternId(plan?.recurringPatternId ?? "");
	}, [open, plan, preset]);

	const categoryOptions = useMemo(
		() =>
			(categories.data?.items ?? [])
				.filter((c) => c.directions.length === 0 || c.directions.includes(direction))
				.map((c) => ({ value: c.code, label: c.name })),
		[categories.data, direction]
	);

	const recurringOptions = useMemo(
		() =>
			(recurring.data?.items ?? [])
				.filter((p) => p.status === "CONFIRMED" && p.direction === direction)
				.map((p) => ({
					value: p.id,
					label: `${p.counterpartyKey ?? p.categoryCode} · ${formatMoney(p.amount)}`,
					hint: describeSchedule(p.schedule),
				})),
		[recurring.data, direction]
	);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const next: Record<string, string> = {};
		const value = parseAmount(amount);
		if (!title.trim()) next.title = "Назовите платёж";
		if (!Number.isFinite(value) || value <= 0) next.amount = "Сумма больше нуля";
		if (!categoryCode) next.categoryCode = "Выберите категорию";
		if (relation === "REPLACES_RECURRING" && !recurringPatternId) next.recurring = "Выберите регулярность";
		if (relation === "REPLACES_BASELINE" && !counterpartyKey.trim()) next.counterparty = "Укажите контрагента";
		setErrors(next);
		if (Object.keys(next).length) return;

		const body: PlanRq = {
			title: title.trim(),
			direction,
			amount: toMoneyString(value),
			dueDate,
			categoryCode,
			counterpartyKey: counterpartyKey.trim() || null,
			note: note.trim() || null,
			relation,
			recurringPatternId: relation === "REPLACES_RECURRING" ? recurringPatternId : null,
			baselineCounterpartyKey: relation === "REPLACES_BASELINE" ? counterpartyKey.trim() : null,
			source: plan?.source ?? preset?.source ?? "MANUAL",
			sourceDocument: plan?.sourceDocument ?? null,
		};

		const rs = plan
			? await update({ companyId, accountId, planId: plan.id, version: plan.version, body })
			: await create({ companyId, accountId, body, idempotencyKey: idem.get(body) });

		if ("data" in rs && rs.data) {
			idem.done();
			toast.success(editing ? "План обновлён" : "План добавлен — прогноз пересчитается");
			onClose();
		} else {
			const p = toProblem(rs.error);
			if (p.errors.length) setErrors(Object.fromEntries(p.errors.map((x) => [x.field, x.message])));
			toast.error(problemMessage(rs.error));
		}
	};

	const busy = createState.isLoading || updateState.isLoading;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={editing ? "Изменить план" : "Новый ожидаемый платёж"}
			description="Будущая операция, которой ещё нет в выписке: счёт, налог, обещанная оплата"
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
						form="plan-form"
						variant="brand"
						disabled={busy}
					>
						<Save />
						{editing ? "Сохранить" : "Добавить в прогноз"}
					</Button>
				</>
			}
		>
			<form
				id="plan-form"
				onSubmit={onSubmit}
				className="flex flex-col gap-4"
				noValidate
			>
				<Segmented
					block
					value={direction}
					onChange={(d) => {
						setDirection(d);
						setCategoryCode("");
						setRecurringPatternId("");
					}}
					label="Направление"
					options={[
						{ value: "OUT", label: "Списание", icon: <ArrowUpRight /> },
						{ value: "IN", label: "Поступление", icon: <ArrowDownLeft /> },
					]}
				/>
				<Field
					label="Что за платёж"
					error={errors.title}
				>
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder={direction === "IN" ? "Оплата от клиента по счёту №15" : "Аренда офиса за декабрь"}
						maxLength={200}
					/>
				</Field>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Сумма, ₽"
						error={errors.amount}
					>
						<Input
							inputMode="decimal"
							value={amount}
							onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ""))}
							placeholder="300 000"
						/>
					</Field>
					<Field label="Дата">
						<DatePicker
							value={dueDate}
							onChange={setDueDate}
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
						placeholder="Выберите категорию"
					/>
				</Field>
				<div className="flex flex-col gap-1.5">
					<span className="text-sm font-medium">Как учитывать</span>
					<Segmented
						block
						size="sm"
						value={relation}
						onChange={setRelation}
						label="Связь с обычными потоками"
						options={(Object.keys(PLAN_RELATION_LABEL) as PlanRelation[]).map((r) => ({
							value: r,
							label: PLAN_RELATION_LABEL[r].label,
						}))}
					/>
					<p className="text-xs text-muted-foreground">{PLAN_RELATION_LABEL[relation].hint}</p>
				</div>
				<AnimatePresence initial={false}>
					{relation === "REPLACES_RECURRING" && (
						<motion.div
							key="rec"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0, transition: tween.exit }}
							transition={spring.glide}
						>
							<Field
								label="Какую регулярность заменяет"
								error={errors.recurring}
								hint={
									recurringOptions.length
										? undefined
										: "Нет подтверждённых регулярностей этого направления"
								}
							>
								<Select
									value={recurringPatternId}
									onChange={setRecurringPatternId}
									options={recurringOptions}
									placeholder="Выберите"
								/>
							</Field>
						</motion.div>
					)}
				</AnimatePresence>
				<Field
					label="Контрагент"
					error={errors.counterparty}
					hint={
						relation === "REPLACES_BASELINE" ? "Обязателен: заменяем его обычные потоки" : "Необязательно"
					}
				>
					<Input
						value={counterpartyKey}
						onChange={(e) => setCounterpartyKey(e.target.value)}
						placeholder="Ключ или название контрагента"
						maxLength={600}
					/>
				</Field>
				<Field label="Комментарий">
					<Input
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="УСН за квартал, договор №…"
						maxLength={1000}
					/>
				</Field>
			</form>
		</Dialog>
	);
});
