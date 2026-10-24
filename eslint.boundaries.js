import boundaries from "eslint-plugin-boundaries";

export const eslintBoundariesConfig = {
	plugins: {
		boundaries,
	},
	settings: {
		"import/resolver": {
			typescript: {
				alwaysTryTypes: true,
			},
		},
		"boundaries/elements": [
			{
				type: "app",
				pattern: "./src/app",
			},
			{
				type: "pages",
				pattern: "./src/pages/*",
			},
			{
				type: "widgets",
				pattern: "./src/widgets/*",
			},
			{
				type: "features",
				pattern: "./src/features/*",
			},
			{
				type: "entities",
				pattern: "./src/entities/*",
			},
			{
				type: "shared",
				pattern: "./src/shared/*",
			},
		],
	},
	rules: {
		"boundaries/element-types": [
			2,
			{
				default: "allow",
				rules: [
					// Запрещаем импорт вышестоящих слоёв в нижестоящие
					{
						from: "shared",
						disallow: ["app", "pages", "widgets", "features", "entities"],
						message: "Shared-слой не может импортировать вышестоящие слои (${dependency.type})",
					},
					{
						from: "entities",
						disallow: ["app", "pages", "widgets", "features"],
						message: "Entities-слой не может импортировать вышестоящие слои (${dependency.type})",
					},
					{
						from: "features",
						disallow: ["app", "pages", "widgets"],
						message: "Features-слой не может импортировать вышестоящие слои (${dependency.type})",
					},
					{
						from: "widgets",
						disallow: ["app", "pages"],
						message: "Widgets-слой не может импортировать вышестоящие слои (${dependency.type})",
					},
					{
						from: "pages",
						disallow: ["app"],
						message: "Pages-слой не может импортировать App-слой (${dependency.type})",
					},
				],
			},
		],
		"boundaries/entry-point": [
			2,
			{
				default: "disallow",
				message:
					"Модуль (${file.type}) должен импортироваться через public API. Прямой импорт из ${dependency.source} запрещён",
				rules: [
					// Разрешаем импорт только через public API
					{
						target: ["shared"], // shared/ui/Button/index.ts
						allow: "**",
					},
					{
						target: ["entities"], // entities/User/index.ts
						allow: ["index.(ts|tsx)"],
					},
					{
						target: ["features"], // features/FeatureA/index.ts или FeatureAPage.tsx
						allow: ["index.(ts|tsx)", "*.page.tsx"],
					},
					{
						target: ["widgets"], // widgets/WidgetA/index.ts или WidgetA.widget.tsx
						allow: ["index.(ts|tsx)", "*.widget.tsx"],
					},
					{
						target: ["pages"], // pages/HomePage/index.ts или HomePage.page.tsx
						allow: ["index.(ts|tsx)", "*.page.tsx"],
					},
					{
						target: ["app"], // app/app.tsx (корневой файл) + разрешаем всё
						allow: ["app.tsx", "**"], // Исключение для app/app.tsx + остальное
					},
				],
			},
		],
	},
};
