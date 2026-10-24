module.exports = {
	semi: true, // точка с запятой в конце строк
	trailingComma: "es5",
	singleQuote: false, // двойные кавычки
	jsxSingleQuote: false, // двойные кавычки в JSX
	printWidth: 120, // максимальная длина строки
	useTabs: true, // использовать табы
	tabWidth: 4, // ширина таба
	endOfLine: "lf", // Unix-стиль переносов
	bracketSpacing: true, // пробелы в { Component }
	arrowParens: "always", // скобки у стрелочных функций
	proseWrap: "always", // перенос Markdown
	singleAttributePerLine: true, // каждый атрибут в JSX на новой строке
	plugins: ["prettier-plugin-tailwindcss"], // сортировка tailwind-классов
	tailwindStylesheet: "./src/app/styles/index.css",
	tailwindFunctions: ["cn", "cva"],
};
