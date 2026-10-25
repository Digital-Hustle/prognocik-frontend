import { useState } from "react";
import { isDemoMode, setDemoMode } from "@/shared/config/demoMode";
import { SwitchRow } from "@/shared/ui/Switch/Switch";

export const DemoModeToggle = () => {
	const [error, setError] = useState(false);
	return (
		<div>
			<SwitchRow
				title="Демонстрационные данные"
				text="Примеры компаний, операций и расчётов. Изменения сбрасываются при перезагрузке."
				checked={isDemoMode()}
				onChange={(enabled) => {
					if (setDemoMode(enabled)) window.location.reload();
					else setError(true);
				}}
			/>
			<p className="text-xs text-muted-foreground">
				При переключении страница перезагрузится. Вход и профиль работают как обычно.
			</p>
			{error && (
				<p
					role="alert"
					className="mt-2 text-sm text-danger"
				>
					Браузер не разрешил сохранить настройку.
				</p>
			)}
		</div>
	);
};
