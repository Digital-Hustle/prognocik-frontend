import { PieChart, Plus, ScrollText } from "lucide-react";
import { useState } from "react";
import { useGetAccountQuery, useGetCompanyQuery } from "@/entities/Company";
import { useWorkspace } from "@/entities/Workspace";
import { ManualPaymentDialog } from "@/features/ManualPayment";
import { addDays, todayIso } from "@/shared/lib/date/date";
import { Button } from "@/shared/ui/Button/Button";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { PaymentsTable } from "@/widgets/PaymentsTable";
import { SpendingAnalytics } from "@/widgets/SpendingAnalytics";

type View = "list" | "analytics";

const OperationsPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const account = useGetAccountQuery({ companyId, accountId });
	const canEdit = company.data?.permissions.canEditPayments ?? false;
	const [view, setView] = useState<View>("list");
	const [manualOpen, setManualOpen] = useState(false);
	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				kicker="История движения денег"
				title="Операции и категории"
				sub="Каждая операция разложена по категории правилом или по контрагенту. Исправьте категорию — прогноз учтёт это при пересчёте."
				actions={
					canEdit ? (
						<Button
							variant="outline"
							onClick={() => setManualOpen(true)}
						>
							<Plus />
							Добавить операцию
						</Button>
					) : undefined
				}
			/>
			<Segmented
				value={view}
				onChange={setView}
				label="Вид"
				options={[
					{ value: "list", label: "Операции", icon: <ScrollText /> },
					{ value: "analytics", label: "Аналитика", icon: <PieChart /> },
				]}
			/>
			{view === "list" ? (
				<PaymentsTable
					companyId={companyId}
					accountId={accountId}
					canEdit={canEdit}
					dataEnd={account.data?.latestBalanceDate}
				/>
			) : (
				<SpendingAnalytics
					companyId={companyId}
					accountId={accountId}
					dataEnd={account.data?.latestBalanceDate}
				/>
			)}
			<ManualPaymentDialog
				open={manualOpen}
				onClose={() => setManualOpen(false)}
				companyId={companyId}
				accountId={accountId}
				maxDate={addDays(todayIso(), -1)}
			/>
		</div>
	);
};

export default OperationsPage;
