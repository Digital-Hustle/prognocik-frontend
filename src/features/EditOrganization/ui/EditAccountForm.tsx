import { Landmark, Save } from "lucide-react";
import { memo, useState } from "react";
import type { FormEvent } from "react";
import type { Account, AccountRq } from "@/entities/Company";
import { problemMessage, toProblem } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { Field, Input } from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast/Toast";
import { useUpdateAccountMutation } from "../api/organizationApi";

/** Правка счёта. Код в выписке уникален в компании: занятый вернёт 409 EXTERNAL_ID_TAKEN. */
export const EditAccountForm = memo(({ account, disabled }: { account: Account; disabled?: boolean }) => {
	const [update, state] = useUpdateAccountMutation();
	const [name, setName] = useState(account.name);
	const [bankName, setBankName] = useState(account.bankName ?? "");
	const [accountNumber, setAccountNumber] = useState(account.accountNumber ?? "");
	const [externalCompanyId, setExternalCompanyId] = useState(account.externalCompanyId ?? "");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const locked = disabled || account.archived;

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const next: Record<string, string> = {};
		if (!name.trim()) next.name = "Укажите название счёта";
		if (accountNumber && !/^\d{20}$/.test(accountNumber)) next.accountNumber = "Номер счёта — 20 цифр";
		if (externalCompanyId && !/^[A-Za-z0-9_.:-]{1,128}$/.test(externalCompanyId))
			next.externalCompanyId = "Латиница, цифры и _ . : -";
		setErrors(next);
		if (Object.keys(next).length) return;

		const body: AccountRq = {
			name: name.trim(),
			bankName: bankName.trim() || null,
			accountNumber: accountNumber || null,
			externalCompanyId: externalCompanyId || null,
		};
		const rs = await update({
			companyId: account.companyId,
			accountId: account.id,
			version: account.version,
			body,
		});
		if ("data" in rs && rs.data) return toast.success("Данные счёта сохранены");
		const p = toProblem(rs.error);
		if (p.code === "EXTERNAL_ID_TAKEN") setErrors({ externalCompanyId: "Этот код уже у другого счёта компании" });
		else if (p.errors.length) setErrors(Object.fromEntries(p.errors.map((x) => [x.field, x.message])));
		toast.error(problemMessage(rs.error));
	};

	return (
		<form
			onSubmit={onSubmit}
			noValidate
		>
			<fieldset
				disabled={locked}
				className="flex min-w-0 flex-col gap-4"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Название счёта"
						error={errors.name}
					>
						<Input
							icon={<Landmark />}
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={200}
						/>
					</Field>
					<Field label="Банк">
						<Input
							value={bankName}
							onChange={(e) => setBankName(e.target.value)}
							maxLength={200}
						/>
					</Field>
				</div>
				<Field
					label="Номер расчётного счёта"
					error={errors.accountNumber}
					hint="20 цифр"
				>
					<Input
						inputMode="numeric"
						value={accountNumber}
						onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 20))}
					/>
				</Field>
				<Field
					label="Код компании в выписке"
					error={errors.externalCompanyId}
					hint="Колонка company_id в CSV, если в файле несколько компаний"
				>
					<Input
						value={externalCompanyId}
						onChange={(e) => setExternalCompanyId(e.target.value.trim())}
					/>
				</Field>
				<Button
					type="submit"
					variant="brand"
					className="self-start"
					disabled={locked || state.isLoading}
				>
					<Save />
					{state.isLoading ? "Сохраняем…" : "Сохранить"}
				</Button>
			</fieldset>
			{disabled && <p className="mt-3 text-xs text-muted-foreground">Счёт меняют владелец и бухгалтер.</p>}
		</form>
	);
});
