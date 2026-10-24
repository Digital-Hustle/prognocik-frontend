import { useGetAccountQuery, useGetCompanyQuery } from "@/entities/Company";
import { useWorkspace } from "@/entities/Workspace";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { PaymentsTable } from "@/widgets/PaymentsTable";

const OperationsPage = () => {
	const { companyId, accountId } = useWorkspace();
	const company = useGetCompanyQuery(companyId);
	const account = useGetAccountQuery({ companyId, accountId });
	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				kicker="История движения денег"
				title="Операции и категории"
				sub="Каждая операция разложена по категории правилом или по контрагенту. Исправьте категорию — прогноз учтёт это при пересчёте."
			/>
			<PaymentsTable
				companyId={companyId}
				accountId={accountId}
				canEdit={company.data?.permissions.canEditPayments ?? false}
				dataEnd={account.data?.latestBalanceDate}
			/>
		</div>
	);
};

export default OperationsPage;
