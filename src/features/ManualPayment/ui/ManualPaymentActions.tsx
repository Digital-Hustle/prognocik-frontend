import { Ban, GitCompareArrows } from "lucide-react";
import { memo, useState } from "react";
import type { Payment } from "@/entities/Payment";
import { Button } from "@/shared/ui/Button/Button";
import { DuplicateResolutionDialog } from "./DuplicateResolutionDialog";
import { VoidPaymentDialog } from "./VoidPaymentDialog";

/** Действия над ручной активной операцией: сопоставить с выпиской или аннулировать. У остальных — пусто. */
export const ManualPaymentActions = memo(({ companyId, payment }: { companyId: string; payment: Payment }) => {
	const [dup, setDup] = useState(false);
	const [voiding, setVoiding] = useState(false);
	if (payment.source !== "MANUAL" || payment.status !== "ACTIVE") return null;
	return (
		<div className="flex items-center justify-end gap-1">
			<Button
				size="icon-sm"
				variant="quiet"
				aria-label="Найти похожие в выписке"
				title="Найти похожие в выписке"
				onClick={() => setDup(true)}
			>
				<GitCompareArrows />
			</Button>
			<Button
				size="icon-sm"
				variant="quiet"
				aria-label="Аннулировать"
				title="Аннулировать"
				onClick={() => setVoiding(true)}
			>
				<Ban />
			</Button>
			<DuplicateResolutionDialog
				open={dup}
				onClose={() => setDup(false)}
				companyId={companyId}
				payment={payment}
			/>
			<VoidPaymentDialog
				open={voiding}
				onClose={() => setVoiding(false)}
				companyId={companyId}
				payment={payment}
			/>
		</div>
	);
});
