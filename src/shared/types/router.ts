import type { RouteProps } from "react-router-dom";

export type AppRoutesProps = RouteProps & {
	/** Только для вошедших */
	authOnly?: boolean;
	/** Нужна выбранная компания и счёт */
	workspaceOnly?: boolean;
	/** Внутри оболочки с шапкой */
	withLayout?: boolean;
	/** Только для гостей (страница входа) */
	guestOnly?: boolean;
};
