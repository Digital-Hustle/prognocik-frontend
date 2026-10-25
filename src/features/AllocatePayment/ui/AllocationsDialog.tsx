import { Link2, Search, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useMemo, useState } from "react";
import { useListAllocationsQuery } from "@/entities/ExpectedPayment";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import { DirectionAmount, useListPaymentsQuery } from "@/entities/Payment";
import type { Payment } from "@/entities/Payment";
import { problemMessage } from "@/shared/api/problem";
import { fadeUp, tween } from "@/shared/config/motion";
import { cn } from "@/shared/lib/cn/cn";
import { addDays, formatDayShort, formatInstant } from "@/shared/lib/date/date";
import { formatMoneyExact, toMoneyString, toNumber } from "@/shared/lib/format/money";
import { useDebounce } from "@/shared/lib/hooks/useDebounce/useDebounce";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { uuid } from "@/shared/lib/id/uuid";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Progress } from "@/shared/ui/Progress/Progress";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { toast } from "@/shared/ui/Toast/Toast";
import { useAllocatePaymentMutation, useReverseAllocationMutation } from "../api/allocateApi";

interface AllocationsDialogProps {
	open: boolean;
	onClose: () => void;
	companyId: string;
	accountId: string;
	plan: ExpectedPayment;
	canEdit: boolean;
}

/**
 * План ↔ факт: частичная оплата не создаёт новый факт — он уже в выписке, мы лишь связываем сумму.
 * Ищем операции того же направления в окне ±30 дней от срока.
 */
export const AllocationsDialog = memo(
	({ open, onClose, companyId, accountId, plan, canEdit }: AllocationsDialogProps) => {
		const allocations = useListAllocationsQuery({ companyId, accountId, planId: plan.id }, { skip: !open });
		const [q, setQ] = useState("");
		const query = useDebounce(q, 300);
		const payments = useListPaymentsQuery(
			{
				companyId,
				accountId,
				direction: plan.direction,
				fromDate: addDays(plan.dueDate, -30),
				toDate: addDays(plan.dueDate, 30),
				q: query || undefined,
				size: 30,
			},
			{ skip: !open || !canEdit }
		);
		const [allocate, allocateState] = useAllocatePaymentMutation();
		const [reverse, reverseState] = useReverseAllocationMutation();
		const allocateKey = useIdempotencyKey();
		const [picked, setPicked] = useState<Payment | null>(null);
		const [amount, setAmount] = useState("");

		const total = toNumber(plan.amount) ?? 0;
		const settled = toNumber(plan.settledAmount) ?? 0;
		const remaining = toNumber(plan.remainingAmount) ?? 0;

		const free = (p: Payment) => Math.max(0, (toNumber(p.amount) ?? 0) - (toNumber(p.allocatedAmount) ?? 0));
		const candidates = useMemo(
			() => (payments.data?.items ?? []).filter((p) => p.status === "ACTIVE" && free(p) > 0),
			[payments.data]
		);

		const pick = (p: Payment) => {
			setPicked(p);
			setAmount(toMoneyString(Math.min(free(p), remaining)));
		};

		const submit = async () => {
			if (!picked) return;
			const value = Number(amount.replace(",", "."));
			if (!Number.isFinite(value) || value <= 0) {
				toast.error("Сумма больше нуля");
				return;
			}
			const body = { planId: plan.id, paymentId: picked.id, amount: toMoneyString(value) };
			const rs = await allocate({ companyId, accountId, ...body, idempotencyKey: allocateKey.get(body) });
			if ("error" in rs) toast.error(problemMessage(rs.error));
			else {
				allocateKey.done();
				toast.success("Оплата сопоставлена с планом");
				setPicked(null);
			}
		};

		return (
			<Dialog
				open={open}
				onClose={onClose}
				title={plan.title}
				description={`Срок ${formatDayShort(plan.dueDate)} · ${formatMoneyExact(plan.amount)}`}
				className="sm:max-w-2xl"
			>
				<div className="flex flex-col gap-5">
					<div className="flex flex-col gap-2 rounded-md bg-muted p-4">
						<div className="flex items-baseline justify-between text-sm">
							<span className="text-muted-foreground">Оплачено</span>
							<span className="font-display tabular-nums">
								{formatMoneyExact(plan.settledAmount)}{" "}
								<span className="text-muted-foreground">из {formatMoneyExact(plan.amount)}</span>
							</span>
						</div>
						<Progress
							value={total > 0 ? settled / total : 0}
							tone={remaining > 0 ? "brand" : "lime"}
						/>
					</div>

					<section className="flex flex-col gap-2">
						<h3 className="text-sm font-semibold">Связанные операции</h3>
						{allocations.isLoading ? (
							<Skeleton className="h-14" />
						) : (allocations.data?.items ?? []).length === 0 ? (
							<p className="text-sm text-muted-foreground">Пока ни одна операция не сопоставлена.</p>
						) : (
							<ul className="flex flex-col gap-1">
								<AnimatePresence initial={false}>
									{allocations.data?.items.map((a) => (
										<motion.li
											key={a.id}
											layout
											variants={fadeUp}
											initial="hidden"
											animate="show"
											exit={{ opacity: 0, transition: tween.exit }}
											className={cn(
												"flex items-center gap-3 rounded-md bg-muted px-3 py-2.5 text-sm",
												a.reversedAt && "opacity-50"
											)}
										>
											<Link2 className="size-4 shrink-0 text-brand" />
											<span className="min-w-0 flex-1">
												<span className="font-medium tabular-nums">
													{formatMoneyExact(a.amount)}
												</span>
												<span className="ml-2 text-xs text-muted-foreground">
													{a.reversedAt
														? `снято ${formatInstant(a.reversedAt)}`
														: `связано ${formatInstant(a.createdAt)}`}
												</span>
											</span>
											{canEdit && !a.reversedAt && (
												<Button
													size="sm"
													variant="quiet"
													disabled={reverseState.isLoading}
													onClick={async () => {
														const rs = await reverse({
															companyId,
															accountId,
															planId: plan.id,
															allocationId: a.id,
															idempotencyKey: uuid(),
														});
														if ("error" in rs) toast.error(problemMessage(rs.error));
														else toast.info("Сопоставление снято");
													}}
												>
													<Undo2 />
													Снять
												</Button>
											)}
										</motion.li>
									))}
								</AnimatePresence>
							</ul>
						)}
					</section>

					{canEdit && remaining > 0 && plan.status !== "CANCELLED" && (
						<section className="flex flex-col gap-3">
							<h3 className="text-sm font-semibold">Сопоставить оплату из выписки</h3>
							<Input
								icon={<Search />}
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder="Контрагент или назначение платежа"
							/>
							{payments.isLoading ? (
								<Skeleton className="h-32" />
							) : candidates.length === 0 ? (
								<EmptyState
									className="py-6"
									title="Подходящих операций нет"
									text="Ищем операции того же направления за 30 дней до и после срока."
								/>
							) : (
								<ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
									{candidates.map((p) => (
										<li key={p.id}>
											<button
												type="button"
												onClick={() => pick(p)}
												className={cn(
													"flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-surface-hover",
													picked?.id === p.id && "bg-accent ring-1 ring-brand"
												)}
											>
												<span className="w-16 shrink-0 text-xs text-muted-foreground">
													{formatDayShort(p.operationDate)}
												</span>
												<span className="min-w-0 flex-1 truncate">
													{p.counterpartyName ?? p.purpose ?? "Операция"}
												</span>
												<DirectionAmount
													amount={p.amount}
													direction={p.direction}
												/>
											</button>
										</li>
									))}
								</ul>
							)}
							<AnimatePresence initial={false}>
								{picked && (
									<motion.div
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, transition: tween.exit }}
										className="flex flex-col gap-3 sm:flex-row sm:items-end"
									>
										<Field
											label="Сколько из этой операции идёт в план"
											hint={`Свободно ${formatMoneyExact(free(picked))}, осталось оплатить ${formatMoneyExact(remaining)}`}
											className="flex-1"
										>
											<Input
												inputMode="decimal"
												value={amount}
												onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
											/>
										</Field>
										<Button
											variant="brand"
											disabled={allocateState.isLoading}
											onClick={() => void submit()}
										>
											<Link2 />
											Сопоставить
										</Button>
									</motion.div>
								)}
							</AnimatePresence>
						</section>
					)}
				</div>
			</Dialog>
		);
	}
);
