import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Фронт ходит только в Gateway. В dev запросы /api проксируются на Gateway, чтобы HttpOnly-cookies
// и CSRF работали как same-origin. В проде VITE_API_URL пустой (тот же origin) или адрес Gateway.
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const gateway = env.VITE_GATEWAY_PROXY || "https://localhost:5001";

	return {
		plugins: [
			react(),
			tailwindcss(),
			{
				// Абсолютные адреса для og:image и og:url: Telegram и соцсети не понимают относительные
				name: "site-url",
				transformIndexHtml: (html: string) =>
					html.replaceAll("%SITE_URL%", (env.VITE_SITE_URL ?? "").replace(/\/$/, "")),
			},
		],
		resolve: {
			alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
		},
		define: {
			__IS_DEV__: JSON.stringify(mode !== "production"),
			__API__: JSON.stringify(env.VITE_API_URL ?? ""),
		},
		server: {
			port: 3000,
			host: "localhost",
			proxy: {
				"/api": {
					target: gateway,
					changeOrigin: false,
					secure: false,
				},
			},
		},
		build: {
			chunkSizeWarningLimit: 1500,
		},
	};
});
