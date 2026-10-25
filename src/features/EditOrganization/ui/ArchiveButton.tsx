import { Archive } from "lucide-react";
import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { workspaceActions } from "@/entities/Workspace";
import { problemMessage } from "@/shared/api/problem";
import { RoutePath } from "@/shared/const/router";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { Dialog } from "@/shared/ui/Dialog/Dialog";
import { toast } from "@/shared/ui/Toast/Toast";
import { useArchiveAccountMutation, useArchiveCompanyMutation } from "../api/organizationApi";

type Target =
	| { kind: "company"; companyId: string; name: string; version: number }
	| { kind: "account"; companyId: string; accountId: string; name: string; version: number };

/** Архивация необратима из интерфейса: после неё компания или счёт доступны только для чтения. */
export const ArchiveButton = memo(({ target, disabled }: { target: Target; disabled?: boolean }) => {
	const [open, setOpen] = useState(false);
	const [archiveCompany, companyState] = useArchiveCompanyMutation();
	const [archiveAccount, accountState] = useArchiveAccountMutation();
	const idem = useIdempotencyKey();
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const isCompany = target.kind === "company";
	const busy = companyState.isLoading || accountState.isLoading;

	const confirm = async () => {
		const body = { companyId: target.companyId, version: target.version };
		const key = idem.get(body);
		const rs =
			target.kind === "company"
				? await archiveCompany({ ...body, idempotencyKey: key })
				: await archiveAccount({ ...body, accountId: target.accountId, idempotencyKey: key });
		if ("error" in rs) return toast.error(problemMessage(rs.error));
		idem.done();
		toast.success(isCompany ? "Компания перенесена в архив" : "Счёт перенесён в архив");
		setOpen(false);
		dispatch(workspaceActions.reset());
		if (!isCompany) dispatch(workspaceActions.selectCompany(target.companyId));
		navigate(RoutePath.onboarding);
	};

	return (
		<>
			<Button
				variant="danger-soft"
				disabled={disabled}
				onClick={() => setOpen(true)}
			>
				<Archive />
				{isCompany ? "Архивировать компанию" : "Архивировать счёт"}
			</Button>
			<Dialog
				open={open}
				onClose={() => !busy && setOpen(false)}
				title={isCompany ? "Архивировать компанию?" : "Архивировать счёт?"}
				description={target.name}
				footer={
					<>
						<Button
							variant="ghost"
							onClick={() => setOpen(false)}
							disabled={busy}
						>
							Отмена
						</Button>
						<Button
							variant="danger"
							onClick={confirm}
							disabled={busy}
						>
							{busy ? "Архивируем…" : "Архивировать"}
						</Button>
					</>
				}
			>
				<p className="text-sm text-muted-foreground">
					{isCompany
						? "Компания и все её счета станут доступны только для чтения: импорт, расчёты и правки будут недоступны."
						: "Счёт станет доступен только для чтения: импорт, расчёты и правки по нему будут недоступны."}{" "}
					Данные сохранятся. После архивации вы вернётесь к выбору {isCompany ? "компании" : "счёта"}.
				</p>
			</Dialog>
		</>
	);
});
