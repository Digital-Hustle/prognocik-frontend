import { isDemoMode } from "@/shared/config/demoMode";

export type DemoHandler = (request: Request) => Promise<Response>;
let loadHandler: (() => Promise<DemoHandler>) | undefined;
let handler: Promise<DemoHandler> | undefined;

export function registerDemoTransport(loader: () => Promise<DemoHandler>): void {
	loadHandler = loader;
}

/** Auth/Profile всегда идут в Gateway. Неизвестные бизнес-ручки в деморежиме не уходят в сеть. */
export function isDemoRequest(url: string): boolean {
	const pathname = new URL(url, "http://localhost").pathname;
	return isDemoMode() && /\/api\/v1\/(orchestrator|preprocessor)(\/|$)/.test(pathname);
}

export async function demoResponse(request: Request): Promise<Response | null> {
	if (!isDemoRequest(request.url)) return null;
	request.signal.throwIfAborted();
	if (!loadHandler) throw new Error("Demo transport is not registered");
	handler ??= loadHandler().catch((error: unknown) => {
		handler = undefined;
		throw error;
	});
	const respond = await handler;
	request.signal.throwIfAborted();
	const response = await respond(request);
	request.signal.throwIfAborted();
	return response;
}

export const apiFetch: typeof fetch = async (input, init) => {
	const request = new Request(input, init);
	return (await demoResponse(request)) ?? fetch(request);
};
