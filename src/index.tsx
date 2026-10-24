import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/app/styles/index.css";
import { ErrorBoundary } from "@/app/providers/ErrorBoundary";
import { StoreProvider } from "@/app/providers/StoreProvider";
import { applyStoredTheme } from "@/shared/ui/ThemeSwitcher/ThemeSwitcher";
import App from "./app/App";

applyStoredTheme();

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
