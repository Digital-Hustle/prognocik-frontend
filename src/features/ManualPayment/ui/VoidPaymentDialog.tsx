import { Ban, TriangleAlert } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { DirectionAmount } from "@/entities/Payment";
import type { Payment } from "@/entities/Payment";
import { problemMessage } from "@/shared/api/problem";
import { formatDayFull } from "@/shared/lib/date/date";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { Field, Input } from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast/Toast";
import { useVoidManualPaymentMutation } from "../api/manualPaymentApi";

interface VoidPaymentDialogProps {
	open: boolean;
	onClose: () => void;
	companyId: string;
	payment: Payment | null;
}

/** Аннулирование ручной операции. Версия — из строки таблицы (If-Match); 409 — данные изменились. */
export const VoidPaymentDialog = memo(({ open, onClose, companyId, payment }: VoidPaymentDialogProps) => {
	const [voidPayment, state] = useVoidManualPaymentMutation();
	const [reason, setReason] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		if (open) {
			setReason("");
			setError("");
		}
	}, [open]);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!payment) return;
		if (!reason.trim()) return setError("Укажите причину");
		const rs = await voidPayment({
			companyId,
			accountId: payment.accountId,
			paymentId: payment.id,
			version: payment.version,
			reason: reason.trim(),
		});
		if ("error" in rs) return toast.error(problemMessage(rs.error));
		toast.success("Операция аннулирована — проверьте полноту этого дня");
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Аннулировать ручную операцию"
			description={
				payment
					? `${formatDayFull(payment.operationDate)} · ${payment.counterpartyName ?? "без контрагента"}`
					: undefined
			}
			footer={
				<>
					<Button
						variant="ghost"
						onClick={onClose}
					>
						Не аннулировать
					</Button>
					<Button
						type="submit"
						form="void-payment-form"
						variant="danger"
						disabled={state.isLoading}
					>
						<Ban />
						Аннулировать
					</Button>
				</>
			}
		>
			<form
				id="void-payment-form"
				onSubmit={onSubmit}
				className="flex flex-col gap-4"
				noValidate
			>
				{payment && (
					<div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
						<span className="truncate text-sm">{payment.purpose ?? "Без назначения"}</span>
						<DirectionAmount
							amount={payment.amount}
							direction={payment.direction}
						/>
					</div>
				)}
				<Field
					label="Причина"
					error={error}
				>
					<Input
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Ошибка ввода"
						maxLength={500}
					/>
				</Field>
				<p className="flex items-start gap-2 text-xs text-muted-foreground">
					<TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
					Привязки к планам снимутся, а день получит статус «полнота не подтверждена»: подтвердите его заново
					в разделе «Качество».
				</p>
			</form>
		</Dialog>
	);
});
