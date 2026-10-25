import type { AssistantSchema } from "./types";

type WithAssistant = { assistant: AssistantSchema };

export const getAssistant = (state: WithAssistant) => state.assistant;
export const getAssistantOpen = (state: WithAssistant) => state.assistant.open;
export const getAssistantMessages = (state: WithAssistant) => state.assistant.messages;
export const getAssistantPending = (state: WithAssistant) => state.assistant.pending;
export const getAssistantPeriod = (state: WithAssistant) => state.assistant.period;
export const getAssistantContext = (state: WithAssistant) => state.assistant.context;
export const getAssistantDraft = (state: WithAssistant) => state.assistant.draft;
