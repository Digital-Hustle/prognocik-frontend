import { Building2 } from "lucide-react";
import { memo, useState } from "react";
import type { FormEvent } from "react";
import type { Company, CompanyRq, LegalForm } from "@/entities/Company";
import { LEGAL_FORM_LABEL } from "@/entities/Company";
import { problemMessage, toProblem } from "@/shared/api/problem";
import { useIdempotencyKey } from "@/shared/lib/hooks/useIdempotencyKey/useIdempotencyKey";
import { validateInn, validateKpp } from "@/shared/lib/validation/taxIds";
import { Button } from "@/shared/ui/Button/Button";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { toast } from "@/shared/ui/Toast/Toast";
import { useCreateCompanyMutation } from "../api/createCompanyApi";

interface CreateCompanyFormProps {
	onCreated: (company: Company) => void;
}

const browserTz = () => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Moscow";
	} catch {
		return "Europe/Moscow";
	}
};

export const CreateCompanyForm = memo(({ onCreated }: CreateCompanyFormProps) => {
	const [create, state] = useCreateCompanyMutation();
	const idem = useIdempotencyKey();
	const [name, setName] = useState("");
	const [legalForm, setLegalForm] = useState<LegalForm>("OOO");
	const [inn, setInn] = useState("");
	const [kpp, setKpp] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const next: Record<string, string> = {};
		if (!name.trim()) next.name = "Укажите название";
		const innError = validateInn(inn, legalForm === "IP" ? "person" : legalForm === "OOO" ? "legal" : "any");
		if (innError) next.inn = innError;
		const kppError = legalForm === "IP" ? null : validateKpp(kpp);
		if (kppError) next.kpp = kppError;
		setErrors(next);
		if (Object.keys(next).length) return;

		const body: CompanyRq = {
			name: name.trim(),
			legalForm,
			inn: inn || null,
			kpp: legalForm === "IP" ? null : kpp || null,
			timezone: browserTz(),
		};
		const rs = await create({ body, idempotencyKey: idem.get(body) });
		if ("data" in rs && rs.data) {
			idem.done();
			toast.success("Компания создана");
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
			<Field
				label="Название"
				error={errors.name}
			>
				<Input
					autoFocus
					icon={<Building2 />}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="ООО «Ромашка»"
					maxLength={500}
				/>
			</Field>
			<div className="flex flex-col gap-1.5">
				<span className="text-sm font-medium">Форма</span>
				<Segmented
					value={legalForm}
					onChange={setLegalForm}
					label="Организационно-правовая форма"
					options={(Object.keys(LEGAL_FORM_LABEL) as LegalForm[]).map((v) => ({
						value: v,
						label: LEGAL_FORM_LABEL[v],
					}))}
				/>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field
					label="ИНН"
					error={errors.inn}
					hint="Необязательно"
				>
					<Input
						inputMode="numeric"
						value={inn}
						onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 12))}
						placeholder="7701234567"
					/>
				</Field>
				{legalForm !== "IP" && (
					<Field
						label="КПП"
						error={errors.kpp}
						hint="Необязательно"
					>
						<Input
							inputMode="numeric"
							value={kpp}
							onChange={(e) =>
								setKpp(
									e.target.value
										.replace(/[^0-9a-zA-Z]/g, "")
										.toUpperCase()
										.slice(0, 9)
								)
							}
							placeholder="770101001"
						/>
					</Field>
				)}
			</div>
			<Button
				type="submit"
				variant="brand"
				size="lg"
				disabled={state.isLoading}
			>
				{state.isLoading ? "Создаём…" : "Создать компанию"}
			</Button>
		</form>
	);
});
