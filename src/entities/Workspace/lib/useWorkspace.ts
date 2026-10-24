import { useSelector } from "react-redux";
import { getWorkspaceAccountId, getWorkspaceCompanyId } from "../model/selectors";

/** Выбранные компания и счёт. На страницах под RequireWorkspace оба id гарантированы. */
export function useWorkspace() {
	const companyId = useSelector(getWorkspaceCompanyId);
	const accountId = useSelector(getWorkspaceAccountId);
	return { companyId: companyId ?? "", accountId: accountId ?? "", ready: Boolean(companyId && accountId) };
}
