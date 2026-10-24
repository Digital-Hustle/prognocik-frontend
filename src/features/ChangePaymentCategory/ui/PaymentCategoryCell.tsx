import { memo } from "react";
import type { Payment } from "@/entities/Payment";
import { problemMessage } from "@/shared/api/problem";
import { toast } from "@/shared/ui/Toast/Toast";
import { CategorySelect } from "./CategorySelect";
import { useChangePaymentCategoryMutation } from "../api/categoryApi";

interface PaymentCategoryCellProps {
	companyId: string;
	accountId: string;
	payment: Payment;
	disabled?: boolean;
}

/** Категория прямо в строке таблицы: PUT с If-Match текущей версии; при 409 перечитываем операцию */
export const PaymentCategoryCell = memo(({ companyId, accountId, payment, disabled }: PaymentCategoryCellProps) => {
	const [change, state] = useChangePaymentCategoryMutation();

	if (disabled || payment.status === "VOIDED") {
		return null;
	}

	return (
		<CategorySelect
			companyId={companyId}
			direction={payment.direction}
			value={payment.categoryCode}
			className={state.isLoading ? "opacity-60" : undefined}
			onChange={async (categoryCode) => {
				if (categoryCode === payment.categoryCode) return;
				const rs = await change({
					companyId,
					accountId,
					paymentId: payment.id,
					version: payment.version,
					categoryCode,
				});
				if ("error" in rs) toast.error(problemMessage(rs.error));
				else toast.success("Категория изменена — прогноз обновится");
			}}
		/>
	);
});
