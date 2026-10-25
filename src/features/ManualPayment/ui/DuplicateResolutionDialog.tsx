import { Check, Equal, Split } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { DirectionAmount } from "@/entities/Payment";
import type { Payment } from "@/entities/Payment";
import { problemMessage } from "@/shared/api/problem";
import { formatDayFull } from "@/shared/lib/date/date";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { toast } from "@/shared/ui/Toast/Toast";
import { useListDuplicateCandidatesQuery, useResolveDuplicateMutation } from "../api/manualPaymentApi";
import type { DuplicateDecision } from "../api/manualPaymentApi";

interface DuplicateResolutionDialogProps {
	open: boolean;
	onClose: () => void;
	companyId: string;
	/** Ручной платёж, для которого ищем совпадения в выписке */
	payment: Payment | null;
}

/**
 * Похожие операции из выписки (дата, сумма и направление совпали). Сходство само ничего не склеивает: решение
 * всегда явное. «Тот же» — ручная операция аннулируется, остаётся банковская; «Другой» — остаются обе.
 */
export const DuplicateResolutionDialog = memo(
	({ open, onClose, companyId, payment }: DuplicateResolutionDialogProps) => {
		const candidates = useListDuplicateCandidatesQuery(
			{ companyId, paymentId: payment?.id ?? "" },
			{ skip: !open || !payment }
		);
		const [resolve, state] = useResolveDuplicateMutation();
		const [reason, setReason] = useState("");
		const [error, setError] = useState("");
		const [busyId, setBusyId] = useState<string | null>(null);

		useEffect(() => {
			if (open) {
				setReason("");
				setError("");
			}
		}, [open]);

		const decide = async (imported: Payment, decision: DuplicateDecision) => {
			if (!payment) return;
			if (!reason.trim()) return setError("Коротко объясните решение");
			setError("");
			setBusyId(imported.id + decision);
			const rs = await resolve({
				companyId,
				accountId: payment.accountId,
				paymentId: payment.id,
				version: payment.version,
				importedPaymentId: imported.id,
				importedPaymentVersion: imported.version,
				decision,
				reason: reason.trim(),
			});
			setBusyId(null);
			if ("error" in rs) return toast.error(problemMessage(rs.error));
			toast.success(
				decision === "SAME" ? "Ручная операция заменена банковской" : "Операции оставлены как разные"
			);
			// Решённый кандидат пропадает из списка; закрываем, когда решать больше нечего
			if (decision === "SAME" || (candidates.data?.items.length ?? 0) <= 1) onClose();
		};

		const items = candidates.data?.items ?? [];

		return (
			<Dialog
				open={open}
				onClose={onClose}
				title="Похожие операции в выписке"
				description={
					payment
						? `${formatDayFull(payment.operationDate)} · ${payment.counterpartyName ?? "без контрагента"}`
						: undefined
				}
				className="sm:max-w-xl"
			>
				{candidates.isLoading ? (
					<Skeleton className="h-28" />
				) : candidates.error ? (
					<ErrorState
						error={candidates.error}
						onRetry={candidates.refetch}
					/>
				) : items.length === 0 ? (
					<EmptyState
						icon={<Check />}
						title="Совпадений нет"
						text="В выписке нет операции с той же датой, суммой и направлением, по которой ещё не принято решение."
					/>
				) : (
					<div className="flex flex-col gap-4">
						<Field
							label="Почему так решили"
							error={error}
						>
							<Input
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Это один и тот же платёж"
								maxLength={500}
							/>
						</Field>
						<ul className="flex flex-col gap-3">
							{items.map((c) => (
								<li
									key={c.id}
									className="flex flex-col gap-3 rounded-lg border border-border p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="truncate text-sm font-medium">
												{c.counterpartyName ?? "Без контрагента"}
											</div>
											<div className="truncate text-xs text-muted-foreground">
												{c.counterpartyInn ? `ИНН ${c.counterpartyInn} · ` : ""}
												{c.purpose ?? "—"}
											</div>
										</div>
										<DirectionAmount
											amount={c.amount}
											direction={c.direction}
										/>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button
											size="sm"
											variant="brand"
											disabled={state.isLoading}
											onClick={() => decide(c, "SAME")}
										>
											<Equal />
											{busyId === c.id + "SAME" ? "Сохраняем…" : "Это тот же платёж"}
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={state.isLoading}
											onClick={() => decide(c, "DIFFERENT")}
										>
											<Split />
											{busyId === c.id + "DIFFERENT" ? "Сохраняем…" : "Это другой платёж"}
										</Button>
									</div>
								</li>
							))}
						</ul>
						<p className="text-xs text-muted-foreground">
							«Тот же платёж» — ручная операция аннулируется, в расчёте остаётся банковская. «Другой» —
							обе операции остаются.
						</p>
					</div>
				)}
			</Dialog>
		);
	}
);
