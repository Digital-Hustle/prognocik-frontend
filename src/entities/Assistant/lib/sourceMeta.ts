import { RoutePath } from "@/shared/const/router";

/** Куда ведёт источник в самом приложении. href источника — путь API, переходить по нему нельзя */
export const SOURCE_META: Record<string, { label: string; to: string }> = {
	DASHBOARD: { label: "Сводка", to: RoutePath.forecast },
	FORECAST: { label: "Прогноз", to: RoutePath.forecast },
	GAP_DETAILS: { label: "Разрыв", to: RoutePath.forecast },
	CATEGORY_ANALYTICS: { label: "Аналитика по категориям", to: RoutePath.operations },
	COUNTERPARTY_ANALYTICS: { label: "Аналитика по контрагентам", to: RoutePath.operations },
	DATA_QUALITY: { label: "Качество данных", to: RoutePath.quality },
	BACKTEST: { label: "Точность прогноза", to: RoutePath.quality },
};
