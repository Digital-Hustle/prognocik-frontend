import { accountState, accounts, companies, makeAccount, makeAccountData, makeCompany, now } from "./data";

const COMPANY_ID = "de000000-0000-4000-8000-000000000004";
const ACCOUNT_ID = "de000000-0000-4000-8000-000000000005";
const EXTERNAL_ID = "DEMO-BULK-001";

const problem = (detail: string) =>
	Response.json(
		{
			type: "about:blank",
			title: detail,
			detail,
			status: 422,
			code: "INVALID_BULK_IMPORT",
		},
		{ status: 422 }
	);

/** Массовый импорт демонстрирует готовый пример. Содержимое пользовательского CSV не читается. */
export async function demoBulkImport(request: Request, operations: boolean): Promise<Response> {
	const form = await request.formData().catch(() => null);
	const file = form?.get("file");
	if (!(file instanceof File) || !/\.csv$/i.test(file.name)) return problem("Выберите CSV-файл");
	const maxMegabytes = operations ? 100 : 2;
	if (file.size > maxMegabytes * 1024 * 1024) return problem(`Размер файла не должен превышать ${maxMegabytes} МБ`);
	if (!operations) {
		const existing = companies.some((company) => company.id === COMPANY_ID);
		if (!existing) companies.push({ ...makeCompany(COMPANY_ID), name: "ООО «Демо Пекарня»", dataVersion: 0 });
		return Response.json({
			total: 1,
			created: existing ? 0 : 1,
			existing: existing ? 1 : 0,
			companies: [
				{ externalCompanyId: EXTERNAL_ID, companyId: COMPANY_ID, status: existing ? "EXISTING" : "CREATED" },
			],
		});
	}
	const company = companies.find((item) => item.id === COMPANY_ID);
	if (!company) return problem("Сначала загрузите companies.csv");
	const existing = accounts.some((account) => account.id === ACCOUNT_ID);
	if (!existing) {
		const account = { ...makeAccount(COMPANY_ID, ACCOUNT_ID), externalCompanyId: EXTERNAL_ID };
		accounts.push(account);
		accountState.set(account.id, makeAccountData(account, true));
		company.dataVersion++;
		company.updatedAt = now();
	}
	const count = accountState.get(ACCOUNT_ID)!.payments.filter((payment) => payment.source === "STATEMENT").length;
	return Response.json({
		companies: 1,
		inserted: existing ? 0 : count,
		existing: existing ? count : 0,
		items: [
			{
				externalCompanyId: EXTERNAL_ID,
				companyId: COMPANY_ID,
				accountId: ACCOUNT_ID,
				inserted: existing ? 0 : count,
				existing: existing ? count : 0,
			},
		],
	});
}
