import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Snapshot = { canInstall: boolean; installed: boolean };

let deferred: BeforeInstallPromptEvent | null = null;
let snapshot: Snapshot = { canInstall: false, installed: false };
const listeners = new Set<() => void>();

const emit = (next: Snapshot) => {
	snapshot = next;
	listeners.forEach((l) => l());
};

export const isStandalone = () =>
	window.matchMedia("(display-mode: standalone)").matches ||
	(navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Браузер присылает beforeinstallprompt один раз и рано — слушаем с самого старта приложения */
export function initInstallPrompt(): void {
	snapshot = { canInstall: false, installed: isStandalone() };
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		deferred = e as BeforeInstallPromptEvent;
		emit({ ...snapshot, canInstall: true });
	});
	window.addEventListener("appinstalled", () => {
		deferred = null;
		emit({ canInstall: false, installed: true });
	});
}

export async function promptInstall(): Promise<void> {
	if (!deferred) return;
	const event = deferred;
	deferred = null;
	emit({ ...snapshot, canInstall: false });
	await event.prompt();
	const { outcome } = await event.userChoice;
	if (outcome === "accepted") emit({ canInstall: false, installed: true });
}

export const useInstallPrompt = () =>
	useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		() => snapshot,
		() => snapshot
	);
