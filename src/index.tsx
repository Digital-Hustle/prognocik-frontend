import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/app/styles/index.css";
import { ErrorBoundary } from "@/app/providers/ErrorBoundary";
import { StoreProvider } from "@/app/providers/StoreProvider";
import { initInstallPrompt } from "@/features/InstallApp";
import { registerDemoTransport } from "@/shared/api/demoTransport";
import { DEMO_MODE_KEY } from "@/shared/config/demoMode";
import { applyStoredTheme } from "@/shared/ui/ThemeSwitcher/ThemeSwitcher";
import App from "./app/App";

applyStoredTheme();
initInstallPrompt();
// Service worker только в проде: кэширует статику сборки, данные счёта (/api) не трогает
if ("serviceWorker" in navigator && !__IS_DEV__) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => undefined);
	});
}
registerDemoTransport(() =>
	import("./app/providers/DemoProvider/api/router").then((module) => module.handleDemoRequest)
);
window.addEventListener("storage", (event) => {
	if (event.key === DEMO_MODE_KEY || event.key === null) window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<StoreProvider>
				<ErrorBoundary>
					<App />
				</ErrorBoundary>
			</StoreProvider>
		</BrowserRouter>
	</StrictMode>
);
