import assert from "node:assert/strict";
import { createServer } from "vite";

const values = new Map();
globalThis.localStorage = {
	getItem: (key) => values.get(key) ?? null,
	setItem: (key, value) => values.set(key, value),
};
const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
let checks = 0;
const check = (condition, message) => {
	assert.ok(condition, message);
	checks++;
};

try {
	const config = await server.ssrLoadModule("/src/shared/config/demoMode.ts");
	const transport = await server.ssrLoadModule("/src/shared/api/demoTransport.ts");
	const { handleDemoRequest } = await server.ssrLoadModule("/src/app/providers/DemoProvider/api/router.ts");
	const { closedDay: day } = await server.ssrLoadModule("/src/app/providers/DemoProvider/api/data.ts");
	const { addDays } = await server.ssrLoadModule("/src/shared/lib/date/date.ts");
	transport.registerDemoTransport(async () => handleDemoRequest);
	const company = `/api/v1/orchestrator/companies/${config.DEMO_COMPANY_ID}`;
	const account = `${company}/accounts/${config.DEMO_ACCOUNT_ID}`;
	const request = (path, method = "GET", body, headers = {}) =>
		new Request(`http://demo.test${path}`, {
			method,
			headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
			body: body ? JSON.stringify(body) : undefined,
		});
	const response = async (path, method = "GET", body, headers) => {
		const rs = await transport.demoResponse(request(path, method, body, headers));
		assert.ok(rs, `No mock response: ${method} ${path}`);
		return rs;
	};
	const get = async (path, method, body, headers) => {
		const rs = await response(path, method, body, headers);
		assert.ok(rs.ok, `Unexpected status ${rs.status}: ${method ?? "GET"} ${path}`);
		checks++;
		return rs.status === 204 ? null : rs.json();
	};
	check(!config.isDemoMode(), "Default must be real API");
	check((await transport.demoResponse(request(`${account}/dashboard`))) === null, "Disabled flag must bypass mocks");
	const realWorkspace = { companyId: "real-company", accountId: "real-account" };
	localStorage.setItem("prognocik.workspace", JSON.stringify(realWorkspace));
	config.setDemoMode(true);
	const { workspaceReducer, workspaceActions } = await server.ssrLoadModule(
		"/src/entities/Workspace/model/workspaceSlice.ts"
	);
	const initialWorkspace = workspaceReducer(undefined, { type: "init" });
	check(initialWorkspace.companyId === config.DEMO_COMPANY_ID, "Demo workspace must load its own company");
	check(
		(await transport.demoResponse(request(`/gateway${account}/dashboard`))).ok,
		"API base paths must not bypass mocks"
	);
	workspaceReducer(
		initialWorkspace,
		workspaceActions.selectAccount({ companyId: "temporary-company", accountId: "temporary-account" })
	);
	check(
		JSON.parse(localStorage.getItem("prognocik.workspace")).companyId === realWorkspace.companyId,
		"Demo selection must not overwrite real workspace"
	);
	check(
		workspaceReducer(undefined, { type: "reload" }).accountId === config.DEMO_ACCOUNT_ID,
		"Reload must reset transient demo accounts"
	);
	for (const path of [
		"/api/v1/auth-profile/auth/csrf",
		"/api/v1/auth-profile/auth/verify",
		"/api/v1/auth-profile/profile/me",
		"/api/v1/auth-profile/auth/sessions",
	]) {
		check((await transport.demoResponse(request(path))) === null, "Auth/Profile must stay real");
	}
	check(
		(await response(`${company}/unknown`, "POST", {})).status === 404,
		"Unknown domain mutation must fail closed"
	);
	check(
		(await response(`${account}/daily-history?from=broken&to=${day}`)).status === 422,
		"Invalid ranges must be rejected"
	);
	const companies = await get("/api/v1/orchestrator/companies");
	check(companies.items.length > 0 && companies.page.total > 0, "Companies must be paginated");
	await get(company);
	await get(`${company}/accounts`);
	await get(account);
	await get(`${company}/members`);
	await get(`${company}/categories`);
	await get(`${company}/counterparties?accountId=${config.DEMO_ACCOUNT_ID}`);
	const dashboard = await get(`${account}/dashboard`);
	check(dashboard.latestForecast.days.length === 30, "Forecast must include all days");
	check(typeof dashboard.currentBalance.balance === "string", "Money must remain a string");
	const forecastId = dashboard.latestForecast.id,
		backtestId = dashboard.latestBacktest.id;
	await get(`${account}/forecasts`);
	await get(`${account}/forecasts/${forecastId}`);
	await get(`${account}/forecasts/${forecastId}/gaps/${dashboard.latestForecast.gaps[0].id}`);
	await get(`${account}/backtests`);
	await get(`${account}/backtests/${backtestId}`);
	await get(`${account}/backtests/${backtestId}/origins`);
	const alerts = await get(`${account}/alerts?activeOnly=true`);
	await get(`${account}/alerts/${alerts.items[0].id}/acknowledge`, "POST");
	check((await get(`${account}/alerts?activeOnly=true`)).items.length === 0, "Acknowledged alerts must disappear");
	for (const [kind, resultId, exports] of [
		["forecasts", forecastId, ["trace", "export"]],
		["backtests", backtestId, ["trace", "export", "report"]],
	]) {
		for (const extension of exports) {
			const rs = await response(`${account}/${kind}/${resultId}/${extension}`);
			check(
				rs.ok && rs.headers.has("Content-Disposition") && (await rs.text()).length > 20,
				"Download must return a file"
			);
		}
	}
	const payments = await get(`${account}/payments?size=2&page=1&direction=OUT`);
	check(
		payments.items.length === 2 && payments.page.page === 1 && payments.items.every((p) => p.direction === "OUT"),
		"Filters and pagination must work"
	);
	const payment = payments.items[0];
	await get(`${account}/payments/${payment.id}`);
	await get(`${account}/payments/${payment.id}/revisions`);
	check(
		(
			await response(
				`${account}/payments/${payment.id}/category`,
				"PUT",
				{ categoryCode: "TAX" },
				{ "If-Match": '"999"' }
			)
		).status === 409,
		"Outdated versions must fail"
	);
	await get(
		`${account}/payments/${payment.id}/category`,
		"PUT",
		{ categoryCode: "TAX" },
		{ "If-Match": `"${payment.version}"` }
	);
	const bulk = await get(
		`${account}/payments/category-changes`,
		"POST",
		{ categoryCode: "RENT", payments: [{ paymentId: payment.id, expectedVersion: payment.version + 1 }] },
		{ "Idempotency-Key": "bulk" }
	);
	check(bulk.items[0].categoryCode === "RENT", "Bulk category changes must persist");
	const manualBody = {
		accountId: config.DEMO_ACCOUNT_ID,
		operationDate: day,
		amount: "1234.56",
		direction: "OUT",
		categoryCode: "OTHER",
		counterpartyInn: null,
		counterpartyName: "Тест",
		purpose: "Расход",
		note: null,
	};
	const manual = await get(`${company}/payments`, "POST", manualBody, { "Idempotency-Key": "manual" });
	check(manual.counterpartyKey !== "supplier", "New counterparties must not merge into the seeded supplier");
	const repeated = await get(`${company}/payments`, "POST", manualBody, { "Idempotency-Key": "manual" });
	check(manual.id === repeated.id, "Retry must not create duplicate payments");
	check(
		(
			await response(
				`${company}/payments`,
				"POST",
				{ ...manualBody, amount: "1.00" },
				{ "Idempotency-Key": "manual" }
			)
		).status === 409,
		"Different body must conflict with used key"
	);
	check(
		(await get(`${account}/dashboard`)).latestForecast.staleness === "STALE",
		"Mutations must stale the forecast"
	);
	await get(`${company}/payments/${manual.id}/duplicate-candidates`);
	const beforeVoid = await get(account);
	await get(`${company}/payments/${manual.id}/void`, "POST", { reason: "Проверка" }, { "If-Match": '"0"' });
	const afterVoid = await get(account);
	check(
		beforeVoid.latestBalance !== afterVoid.latestBalance &&
			(await get(`${account}/payments/${manual.id}`)).status === "VOIDED",
		"Void must update payment and balance"
	);
	const candidates = (await get(`${account}/payments?size=10&direction=OUT`)).items;
	const imported = candidates.find((p) => p.source === "STATEMENT");
	for (const decision of ["DIFFERENT", "SAME"]) {
		const copy = await get(`${company}/payments`, "POST", {
			...manualBody,
			operationDate: imported.operationDate,
			amount: imported.amount,
		});
		check(
			(await get(`${company}/payments/${copy.id}/duplicate-candidates`)).items.some((p) => p.id === imported.id),
			"Matching bank payment must be suggested"
		);
		const resolved = await get(
			`${company}/payments/${copy.id}/duplicate-resolutions`,
			"POST",
			{ importedPaymentId: imported.id, importedPaymentVersion: imported.version, decision, reason: "Проверка" },
			{ "If-Match": '"0"' }
		);
		check(
			resolved.status === (decision === "SAME" ? "VOIDED" : "ACTIVE"),
			"Duplicate decisions must preserve selected behavior"
		);
		check(
			(await get(`${company}/payments/${copy.id}/duplicate-candidates`)).items.every((p) => p.id !== imported.id),
			"Resolved pair must disappear"
		);
	}
	const planBody = {
		title: "Тестовый план",
		direction: "OUT",
		amount: "1000.00",
		dueDate: day,
		categoryCode: "OTHER",
		counterpartyKey: null,
		note: null,
		relation: "ADDITIONAL",
		recurringPatternId: null,
		baselineCounterpartyKey: null,
		source: "MANUAL",
		sourceDocument: null,
	};
	const plan = await get(`${account}/expected-payments`, "POST", planBody);
	await get(`${account}/expected-payments/${plan.id}`);
	const rangedPlans = await get(`${account}/expected-payments?from=${addDays(day, 10)}&to=${addDays(day, 12)}`);
	check(
		rangedPlans.items.length === 1 && rangedPlans.items[0].dueDate === addDays(day, 11),
		"Plan date filtering must use frontend query parameters"
	);
	const updatedPlan = await get(
		`${account}/expected-payments/${plan.id}`,
		"PUT",
		{ ...planBody, amount: "2000.00" },
		{ "If-Match": '"0"' }
	);
	const allocation = await get(`${account}/expected-payments/${plan.id}/allocations`, "POST", {
		paymentId: imported.id,
		amount: "1000.00",
	});
	check(
		(await get(`${account}/expected-payments/${plan.id}`)).status === "PARTIALLY_SETTLED",
		"Allocation must update plan"
	);
	await get(`${account}/expected-payments/${plan.id}/allocations`);
	await get(`${account}/allocations/${allocation.id}/reverse`, "POST");
	check(
		(await get(`${account}/expected-payments/${plan.id}`)).settledAmount === "0.00",
		"Reversal must restore plan"
	);
	const currentPlan = await get(`${account}/expected-payments/${plan.id}`);
	await get(`${account}/expected-payments/${plan.id}/cancel`, "POST", {}, { "If-Match": `"${currentPlan.version}"` });
	check(updatedPlan.version > plan.version, "Plan version must advance");
	const range = `accountId=${config.DEMO_ACCOUNT_ID}&fromDate=${addDays(day, -29)}&toDate=${day}`;
	for (const suffix of [
		`${company}/analytics/categories?${range}`,
		`${company}/analytics/counterparties?${range}`,
		`${company}/plan-fact?${range}&groupBy=DAY`,
		`${company}/plan-fact?${range}&groupBy=WEEK`,
	])
		await get(suffix);
	await get(`${account}/daily-history?from=${addDays(day, -41)}&to=${day}`);
	await get(`${account}/data-quality`);
	await get(`${account}/completeness-ranges`);
	await get(`${account}/completeness`, "POST", {
		fromDate: day,
		toDate: day,
		completeness: "CONFIRMED_COMPLETE",
		reason: "Проверено",
	});
	await get(`${account}/balance-anchors`, "POST", {
		date: day,
		balance: "1300000.00",
		reason: "Остаток",
		supersedesId: null,
	});
	await get(`${account}/balance-anchors`);
	const patterns = await get(`${account}/recurring-patterns`);
	const pattern = patterns.items.find((p) => p.status === "DETECTED");
	await get(
		`${account}/recurring-patterns/${pattern.id}/status`,
		"PUT",
		{ status: "EXCLUDED" },
		{ "If-Match": `"${pattern.version}"` }
	);
	await get(`${account}/recurring-patterns/confirm-detected`, "POST");
	check(
		(await get(`${account}/recurring-patterns/confirm-detected`, "POST")).items.length === 0,
		"Confirm all must be repeatable"
	);
	check(
		(await get(`${account}/recurring-patterns`)).items.find((p) => p.id === pattern.id).status === "EXCLUDED",
		"Confirm all must preserve manual decisions"
	);
	const settings = await get(`${account}/forecast-settings`);
	await get(
		`${account}/forecast-settings`,
		"PUT",
		{ ...settings, algorithm: "WEEKDAY_MEAN_V1" },
		{ "If-Match": `"${settings.version}"` }
	);
	for (const jobType of ["forecast", "backtest", "recurring-detection"]) {
		const job = await get(`${account}/${jobType}-jobs`, "POST", {
			asOfDate: day,
			scope: "WITH_KNOWN_PLANS",
			firstOrigin: addDays(day, -65),
			lastOrigin: addDays(day, -30),
			stepDays: 7,
		});
		check((await get(`${company}/jobs/${job.id}`)).status === "SUCCEEDED", "Polling must reach terminal state");
		if (jobType === "backtest")
			check(
				(await get(`${account}/backtests/${job.resultId}`)).scope === "WITH_KNOWN_PLANS",
				"Backtest must preserve requested scope"
			);
		await get(`${company}/jobs/${job.id}/cancel`, "POST");
	}
	check(
		(await get(`${account}/dashboard`)).latestForecast.algorithm === "WEEKDAY_MEAN_V1",
		"Recalculation must use updated settings"
	);
	for (const [message, expected] of [
		["Почему разрыв?", "ANSWERED"],
		["Расскажи анекдот", "OUT_OF_SCOPE"],
		["Сравни периоды", "NEEDS_CLARIFICATION"],
	]) {
		check(
			(await get(`${account}/assistant/chat`, "POST", { message })).status === expected,
			"Assistant must support response statuses"
		);
	}
	const form = new FormData();
	form.set("accountId", config.DEMO_ACCOUNT_ID);
	form.set("file", new File(["sample"], "example.csv", { type: "text/csv" }));
	const upload = await transport.demoResponse(
		new Request(`http://demo.test/api/v1/preprocessor/companies/${config.DEMO_COMPANY_ID}/imports`, {
			method: "POST",
			body: form,
		})
	);
	check(upload.ok, "Upload must be handled locally");
	const importedFile = await upload.json();
	const bulkUpload = async (path, filename) => {
		const form = new FormData();
		form.set("file", new File(["demo"], filename, { type: "text/csv" }));
		const rs = await transport.demoResponse(
			new Request(`http://demo.test/api/v1/orchestrator${path}`, { method: "POST", body: form })
		);
		assert.ok(rs?.ok, `Bulk import must work in demo mode: ${path}`);
		checks++;
		return rs.json();
	};
	const bulkCompanies = await bulkUpload("/companies/imports", "companies.csv");
	check(
		bulkCompanies.created === 1 && bulkCompanies.companies[0].status === "CREATED",
		"Bulk company import must create a visible example company"
	);
	const repeatedCompanies = await bulkUpload("/companies/imports", "companies.csv");
	check(
		repeatedCompanies.created === 0 && repeatedCompanies.existing === 1,
		"Repeating a company import must not duplicate companies"
	);
	const bulkOperations = await bulkUpload("/companies/operations/imports", "all_operations.csv");
	check(
		bulkOperations.inserted > 0 && bulkOperations.items[0].accountId,
		"Bulk operation import must create an account with data"
	);
	const repeatedOperations = await bulkUpload("/companies/operations/imports", "all_operations.csv");
	check(
		repeatedOperations.inserted === 0 && repeatedOperations.existing === bulkOperations.inserted,
		"Repeating an operation import must not duplicate payments"
	);
	const bulkAccount = `/api/v1/orchestrator/companies/${bulkOperations.items[0].companyId}/accounts/${bulkOperations.items[0].accountId}`;
	check(
		(await get(`${bulkAccount}/dashboard`)).currentBalance !== null,
		"Imported demo account must have a usable dashboard"
	);
	await get(`${company}/imports?accountId=${config.DEMO_ACCOUNT_ID}`);
	await get(`${company}/imports/${importedFile.id}`);
	await get(`${company}/imports/${importedFile.id}/issues`);
	const createdCompany = await get("/api/v1/orchestrator/companies", "POST", { name: "Новая компания" });
	const createdAccount = await get(`/api/v1/orchestrator/companies/${createdCompany.id}/accounts`, "POST", {
		name: "Пустой счёт",
	});
	const fresh = `/api/v1/orchestrator/companies/${createdCompany.id}/accounts/${createdAccount.id}`;
	check((await get(`${fresh}/dashboard`)).currentBalance === null, "Empty account must not show zero balance");
	check(
		(await get(`${fresh}/daily-history?from=${day}&to=${day}`)).items[0].inflow === null,
		"Missing history must stay null"
	);
	check(
		(await response(`${fresh}/forecast-jobs`, "POST", { asOfDate: day })).status === 422,
		"Forecast without balance must fail"
	);
	await get(
		`/api/v1/orchestrator/companies/${createdCompany.id}`,
		"PUT",
		{ name: "Изменённая компания" },
		{ "If-Match": '"0"' }
	);
	await get(fresh, "PUT", { name: "Изменённый счёт" }, { "If-Match": '"0"' });
	await get(`${fresh}/archive`, "POST", {}, { "If-Match": '"1"' });
	await get(`/api/v1/orchestrator/companies/${createdCompany.id}/archive`, "POST", {}, { "If-Match": '"1"' });
	const preview = await get(`${account}/integrations/bitrix24/sync`, "POST", { mode: "DEMO", dryRun: true });
	check(preview.dryRun && preview.created > 0 && !preview.dataChanged, "Bitrix preview must not change data");
	check((await get(`${account}/integrations/bitrix24`)).activePlans === 0, "Preview must not create plans");
	const synced = await get(`${account}/integrations/bitrix24/sync`, "POST", { mode: "DEMO" });
	check(synced.dataChanged && synced.created === preview.created, "Bitrix sync must create planned items");
	const again = await get(`${account}/integrations/bitrix24/sync`, "POST", { mode: "DEMO" });
	check(!again.dataChanged && again.unchanged === synced.created, "Second Bitrix sync must be a no-op");
	check(
		(await get(`${account}/expected-payments?from=${day}&to=${addDays(day, 60)}`)).items.some(
			(plan) => plan.sourceDocument?.externalSystem === "BITRIX24"
		),
		"Bitrix plans must carry sourceDocument"
	);
	check((await get(`${company}/tax-calendar?year=2026`)).items.length > 0, "Tax calendar must have items");
	const calendar = await get(`${account}/payment-calendar?fromDate=${day}&toDate=${addDays(day, 29)}`);
	check(calendar.days.length === 30, "Payment calendar must include every date");
	check(
		(await response(`${account}/payment-calendar?fromDate=${day}&toDate=${addDays(day, 400)}`)).status === 422,
		"Range over 366 days must fail"
	);
	const employee = await get(
		`${company}/employees`,
		"POST",
		{ fullName: "Тест Тестов" },
		{ "Idempotency-Key": "employee-test-1" }
	);
	const salaried = await get(
		`${company}/employees/${employee.id}/salary`,
		"PUT",
		{
			accountId: config.DEMO_ACCOUNT_ID,
			amount: "85000.50",
			counterpartyName: "Тест Тестов",
			schedule: { frequency: "MONTHLY", weekday: null, dayOfMonth: 10, businessDayRule: "FOLLOWING" },
		},
		{ "If-Match": '"1"' }
	);
	check(salaried.recurringPayment.employeePayment && salaried.version === 2, "Salary must link a payment");
	check(
		(await response(`${company}/employees/${employee.id}/archive`, "POST", {})).status === 428,
		"Archive without If-Match must fail"
	);
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(
		() =>
			transport.demoResponse(new Request(`http://demo.test${account}/dashboard`, { signal: controller.signal })),
		{ name: "AbortError" }
	);
	checks++;
	config.setDemoMode(false);
	check(
		workspaceReducer(undefined, { type: "reload" }).companyId === realWorkspace.companyId,
		"Real workspace must survive toggling"
	);
	check((await transport.demoResponse(request(account))) === null, "Disabling must restore real API");
	console.log(`Demo integration: ${checks} checks passed`);
} finally {
	await server.close();
}
