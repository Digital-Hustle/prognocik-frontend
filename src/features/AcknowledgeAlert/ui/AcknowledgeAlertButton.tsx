import { CheckCheck } from "lucide-react";
import { memo } from "react";
import { problemMessage } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { toast } from "@/shared/ui/Toast/Toast";
import { useAcknowledgeAlertMutation } from "../api/ackApi";

interface AcknowledgeAlertButtonProps {
	companyId: string;
	accountId: string;
	alertId: string;
}

export const AcknowledgeAlertButton = memo(({ companyId, accountId, alertId }: AcknowledgeAlertButtonProps) => {
	const [ack, state] = useAcknowledgeAlertMutation();
	return (
		<Button
			size="sm"
			variant="quiet"
			disabled={state.isLoading}
			onClick={async (e) => {
				e.stopPropagation();
				const rs = await ack({ companyId, accountId, alertId });
				if ("error" in rs) toast.error(problemMessage(rs.error));
			}}
		>
			<CheckCheck />
			Понятно
		</Button>
	);
});
