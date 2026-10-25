import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { workspaceActions } from "@/entities/Workspace";
import { BulkImportWizard } from "@/features/BulkImport";
import { RoutePath } from "@/shared/const/router";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { Logo } from "@/shared/ui/Logo/Logo";

/** Демо-показ: загрузка выгрузки организаторов целиком, затем обычный сценарий одной компании. */
const DemoImportPage = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();

	const openAccount = useCallback(
		(companyId: string, accountId: string) => {
			dispatch(workspaceActions.selectAccount({ companyId, accountId }));
			navigate(RoutePath.forecast);
		},
		[dispatch, navigate]
	);

	return (
		<div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-3 py-6 sm:px-6 sm:py-10">
			<div className="flex items-center justify-between gap-3">
				<Logo sub="Банк Центр-инвест" />
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate(RoutePath.onboarding)}
				>
					<ArrowLeft />К организациям
				</Button>
			</div>
			<div>
				<p className="text-sm font-medium text-brand">Демо-показ</p>
				<h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
					Все организации и операции — за две загрузки
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Сначала список организаций, затем общий файл операций. После этого откройте любую организацию и
					постройте прогноз — как для обычной компании.
				</p>
			</div>
			<Card className="p-5 sm:p-8">
				<BulkImportWizard
					onOpenAccount={openAccount}
					onBrowse={() => navigate(RoutePath.onboarding)}
				/>
			</Card>
		</div>
	);
};

export default DemoImportPage;
