import { Building2, Save } from "lucide-react";
import { memo, useState } from "react";
import type { FormEvent } from "react";
import type { Company, CompanyRq, LegalForm } from "@/entities/Company";
import { LEGAL_FORM_LABEL } from "@/entities/Company";
import { problemMessage, toProblem } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { toast } from "@/shared/ui/Toast/Toast";
import { useUpdateCompanyMutation } from "../api/organizationApi";

/** Правка компании: PUT полный, часовой пояс остаётся прежним. Менять может только владелец. */
export const EditCompanyForm = memo(({ company, disabled }: { company: Company; disabled?: boolean }) => {
	const [update, state] = useUpdateCompanyMutation();
	const [name, setName] = useState(company.name);
	const [legalForm, setLegalForm] = useState<LegalForm>(company.legalForm ?? "OOO");
	const [inn, setInn] = useState(company.inn ?? "");
	const [kpp, setKpp] = useState(company.kpp ?? "");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const locked = disabled || company.archived;

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const next: Record<string, string> = {};
		if (!name.trim()) next.name = "Укажите название";
		if (inn && !/^(\d{10}|\d{12})$/.test(inn)) next.inn = "ИНН — 10 цифр для организации или 12 для ИП";
		if (kpp && !/^\d{9}$/.test(kpp)) next.kpp = "КПП — 9 цифр";
		setErrors(next);
		if (Object.keys(next).length) return;

		const body: CompanyRq = {
			name: name.trim(),
			legalForm,
			inn: inn || null,
			kpp: legalForm === "IP" ? null : kpp || null,
			timezone: company.timezone,
		};
		const rs = await update({ companyId: company.id, version: company.version, body });
		if ("data" in rs && rs.data) return toast.success("Данные компании сохранены");
		const p = toProblem(rs.error);
		if (p.errors.length) setErrors(Object.fromEntries(p.errors.map((x) => [x.field, x.message])));
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
				<Field
					label="Название"
					error={errors.name}
				>
					<Input
						icon={<Building2 />}
						value={name}
						onChange={(e) => setName(e.target.value)}
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
					>
						<Input
							inputMode="numeric"
							value={inn}
							onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 12))}
						/>
					</Field>
					{legalForm !== "IP" && (
						<Field
							label="КПП"
							error={errors.kpp}
						>
							<Input
								inputMode="numeric"
								value={kpp}
								onChange={(e) => setKpp(e.target.value.replace(/\D/g, "").slice(0, 9))}
							/>
						</Field>
					)}
				</div>
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
			{!disabled && company.archived && (
				<p className="mt-3 text-xs text-muted-foreground">Компания в архиве — изменения недоступны.</p>
			)}
			{disabled && <p className="mt-3 text-xs text-muted-foreground">Данные компании меняет только владелец.</p>}
		</form>
	);
});
