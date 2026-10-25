import { Archive, Unlink } from "lucide-react";
import { memo, useState } from "react";
import type { Employee } from "@/entities/Employee";
import { problemMessage } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { toast } from "@/shared/ui/Toast/Toast";
import { useArchiveEmployeeMutation, useUnlinkPaymentMutation } from "../api/manageEmployeesApi";

type Kind = "unlink" | "archive";

/** Отключение выплаты и архив: оба действия необратимы из интерфейса, поэтому с подтверждением. */
export const EmployeeActions = memo(({ companyId, employee }: { companyId: string; employee: Employee }) => {
	const [kind, setKind] = useState<Kind | null>(null);
	const [unlink, unlinkState] = useUnlinkPaymentMutation();
	const [archive, archiveState] = useArchiveEmployeeMutation();
	const busy = unlinkState.isLoading || archiveState.isLoading;

	const confirm = async () => {
		const args = { companyId, employeeId: employee.id, version: employee.version };
		const rs = kind === "unlink" ? await unlink(args) : await archive(args);
		if ("error" in rs) return toast.error(problemMessage(rs.error));
		toast.success(kind === "unlink" ? "Выплата отключена. Пересчитайте прогноз" : "Сотрудник в архиве");
		setKind(null);
	};

	return (
		<>
			{employee.recurringPayment && (
				<Button
					size="sm"
					variant="ghost"
					onClick={() => setKind("unlink")}
				>
					<Unlink />
					Отключить выплату
				</Button>
			)}
			<Button
				size="sm"
				variant="quiet"
				onClick={() => setKind("archive")}
			>
				<Archive />В архив
			</Button>
			<Dialog
				open={kind !== null}
				onClose={() => !busy && setKind(null)}
				title={kind === "unlink" ? "Отключить выплату?" : "Архивировать сотрудника?"}
				description={employee.fullName}
				footer={
					<>
						<Button
							variant="ghost"
							onClick={() => setKind(null)}
							disabled={busy}
						>
							Отмена
						</Button>
						<Button
							variant="danger"
							onClick={confirm}
							disabled={busy}
						>
							{busy ? "Подождите…" : kind === "unlink" ? "Отключить" : "Архивировать"}
						</Button>
					</>
				}
			>
				<p className="text-sm text-muted-foreground">
					{kind === "unlink"
						? "Будущие выплаты зарплаты исчезнут из прогноза. Старые выплаты этого получателя не вернутся в базовый расчёт автоматически."
						: "Карточка станет доступна только для чтения, будущие регулярные выплаты отключатся. Восстановить из архива нельзя. Уже созданные планы (например, финальный расчёт) останутся в прогнозе."}
				</p>
			</Dialog>
		</>
	);
});
