import type { WorkspaceSchema } from "./types";

type WithWorkspace = { workspace: WorkspaceSchema };

export const getWorkspaceCompanyId = (state: WithWorkspace) => state.workspace.companyId;
export const getWorkspaceAccountId = (state: WithWorkspace) => state.workspace.accountId;
