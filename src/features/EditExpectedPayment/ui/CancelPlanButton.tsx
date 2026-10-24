import { Ban } from "lucide-react";
import { memo } from "react";
import type { ExpectedPayment } from "@/entities/ExpectedPayment";
import { problemMessage } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCancelExpectedPaymentMutation } from "../api/editPlanApi";

interface CancelPlanButtonProps {
	companyId: string;
	accountId: string;
	plan: ExpectedPayment;
}

/** Отменяет неоплаченную часть плана */
export const CancelPlanButton = memo(({ companyId, accountId, plan }: CancelPlanButtonProps) => {
	const [cancel, state] = useCancelExpectedPaymentMutation();
	return (
		<Button
			size="sm"
			variant="quiet"
			disabled={state.isLoading}
			onClick={async () => {
				const rs = await cancel({ companyId, accountId, planId: plan.id, version: plan.version });
				if ("error" in rs) toast.error(problemMessage(rs.error));
				else toast.success("План отменён");
			}}
		>
			<Ban />
			Отменить
		</Button>
	);
});
