import { Save } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Employee } from "@/entities/Employee";
import { problemMessage } from "@/shared/api/problem";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { validateInn } from "@/shared/lib/validation/taxIds";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { Field, Input } from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateEmployeeMutation, useUpdateEmployeeMutation } from "../api/manageEmployeesApi";

interface Props {
	open: boolean;
	onClose: () => void;
	companyId: string;
	/** Редактирование; без него — создание */
	employee?: Employee | null;
}

/** Карточка сотрудника: ФИО, должность, ИНН, заметка. PUT заменяет все поля — пустые очищаются. */
export const EmployeeFormDialog = memo(({ open, onClose, companyId, employee }: Props) => {
	const [create, createState] = useCreateEmployeeMutation();
	const [update, updateState] = useUpdateEmployeeMutation();
	const idem = useIdempotencyKey();
	const [fullName, setFullName] = useState("");
	const [position, setPosition] = useState("");
	const [note, setNote] = useState("");
	const [inn, setInn] = useState("");
	const [error, setError] = useState<string | null>(null);
	const busy = createState.isLoading || updateState.isLoading;

	useEffect(() => {
		if (!open) return;
		setFullName(employee?.fullName ?? "");
		setPosition(employee?.position ?? "");
		setNote(employee?.note ?? "");
		setInn(employee?.inn ?? "");
		setError(null);
	}, [open, employee]);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		const name = fullName.trim();
		if (!name) return setError("Укажите ФИО");
		const innError = validateInn(inn, "person");
		if (innError) return setError(innError);
		// PUT заменяет карточку целиком: пустой ИНН очищается
		const body = {
			fullName: name,
			position: position.trim() || null,
			note: note.trim() || null,
			inn: inn.trim() || null,
		};
		const rs = employee
			? await update({ companyId, employeeId: employee.id, version: employee.version, body })
			: await create({ companyId, body, idempotencyKey: idem.get(body) });
		if ("error" in rs) return setError(problemMessage(rs.error));
		idem.done();
		toast.success(employee ? "Карточка сохранена" : "Сотрудник добавлен");
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={() => !busy && onClose()}
			title={employee ? "Карточка сотрудника" : "Новый сотрудник"}
			description="Это данные компании для прогноза зарплаты, а не пользователь приложения."
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
						form="employee-form"
						disabled={busy}
					>
						<Save />
						{busy ? "Сохраняем…" : "Сохранить"}
					</Button>
				</>
			}
		>
			<form
				id="employee-form"
				onSubmit={submit}
				className="flex flex-col gap-4"
			>
				<Field label="ФИО">
					<Input
						value={fullName}
						maxLength={500}
						onChange={(e) => setFullName(e.target.value)}
						autoFocus
					/>
				</Field>
				<Field label="Должность">
					<Input
						value={position}
						maxLength={200}
						onChange={(e) => setPosition(e.target.value)}
					/>
				</Field>
				<Field
					label="ИНН"
					hint="Необязательно. 12 цифр ИНН физлица — как у получателя зарплаты в выписке"
				>
					<Input
						value={inn}
						inputMode="numeric"
						maxLength={12}
						onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 12))}
						placeholder="500100732259"
					/>
				</Field>
				<Field label="Заметка">
					<Input
						value={note}
						maxLength={1000}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Например: оклад за полный месяц"
					/>
				</Field>
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
