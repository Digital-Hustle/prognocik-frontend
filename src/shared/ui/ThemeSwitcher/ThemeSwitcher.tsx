import { Monitor, Moon, Sun } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { THEME_LOCAL_STORAGE_KEY } from "@/shared/const/localstorage";
import { storage } from "@/shared/lib/storage";
import { Segmented } from "../Segmented/Segmented";

export type ThemeMode = "light" | "dark" | "system";

const read = (): ThemeMode => (storage.get(THEME_LOCAL_STORAGE_KEY) as ThemeMode) || "system";
const resolve = (m: ThemeMode) =>
	m === "dark" || (m === "system" && matchMedia("(prefers-color-scheme: dark)").matches);

/** Применить сохранённую тему (дублирует no-flash скрипт в index.html). */
export const applyStoredTheme = () => document.documentElement.classList.toggle("dark", resolve(read()));

/** Смена темы плавным переливом (View Transitions), если тема действительно меняется. */
const applyAnimated = () => {
	const changes = document.documentElement.classList.contains("dark") !== resolve(read());
	const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (changes && !reduce && document.startViewTransition) document.startViewTransition(applyStoredTheme);
	else applyStoredTheme();
};

/** Режим темы с сохранением и подпиской на системную. */
export const useThemeMode = () => {
	const [mode, setMode] = useState<ThemeMode>(read);
	useEffect(() => {
		storage.set(THEME_LOCAL_STORAGE_KEY, mode);
		applyAnimated();
		if (mode !== "system") return;
		const mq = matchMedia("(prefers-color-scheme: dark)");
		mq.addEventListener("change", applyAnimated);
		return () => mq.removeEventListener("change", applyAnimated);
	}, [mode]);
	return [mode, setMode] as const;
};

export const ThemeSwitcher = memo(({ className }: { className?: string }) => {
	const [mode, setMode] = useThemeMode();
	return (
		<Segmented
			size="sm"
			value={mode}
			onChange={setMode}
			label="Тема"
			className={className}
			options={[
				{ value: "light", label: <span className="sr-only">Светлая</span>, icon: <Sun />, title: "Светлая" },
				{ value: "dark", label: <span className="sr-only">Тёмная</span>, icon: <Moon />, title: "Тёмная" },
				{
					value: "system",
					label: <span className="sr-only">Как в системе</span>,
					icon: <Monitor />,
					title: "Как в системе",
				},
			]}
		/>
	);
});
