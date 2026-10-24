import { Landmark } from "lucide-react";
import { memo, useState } from "react";
import type { FormEvent } from "react";
import type { Account, AccountRq } from "@/entities/Company";
import { problemMessage, toProblem } from "@/shared/api/problem";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { Button } from "@/shared/ui/Button/Button";
import { Field, Input } from "@/shared/ui/Input/Input";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateAccountMutation } from "../api/createAccountApi";

interface CreateAccountFormProps {
	companyId: string;
	onCreated: (account: Account) => void;
}

export const CreateAccountForm = memo(({ companyId, onCreated }: CreateAccountFormProps) => {
	const [create, state] = useCreateAccountMutation();
	const idem = useIdempotencyKey();
	const [name, setName] = useState("Основной счёт");
	const [bankName, setBankName] = useState("Центр-инвест");
	const [accountNumber, setAccountNumber] = useState("");
	const [externalCompanyId, setExternalCompanyId] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});

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
		const rs = await create({ companyId, body, idempotencyKey: idem.get(body) });
		if ("data" in rs && rs.data) {
			idem.done();
			toast.success("Счёт добавлен");
			onCreated(rs.data);
		} else {
			const p = toProblem(rs.error);
			if (p.errors.length) setErrors(Object.fromEntries(p.errors.map((x) => [x.field, x.message])));
			toast.error(problemMessage(rs.error));
		}
	};

	return (
		<form
			onSubmit={onSubmit}
			className="flex flex-col gap-4"
			noValidate
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
				hint="20 цифр, необязательно"
			>
				<Input
					inputMode="numeric"
					value={accountNumber}
					onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 20))}
					placeholder="40702810000000000001"
				/>
			</Field>
			<Field
				label="Код компании в выписке"
				error={errors.externalCompanyId}
				hint="Колонка company_id в CSV, если в одном файле несколько компаний (например, C001)"
			>
				<Input
					value={externalCompanyId}
					onChange={(e) => setExternalCompanyId(e.target.value.trim())}
					placeholder="C001"
				/>
			</Field>
			<Button
				type="submit"
				variant="brand"
				size="lg"
				disabled={state.isLoading}
			>
				{state.isLoading ? "Добавляем…" : "Добавить счёт"}
			</Button>
		</form>
	);
});
