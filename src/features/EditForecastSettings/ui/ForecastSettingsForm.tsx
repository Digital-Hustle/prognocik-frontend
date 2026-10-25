import { Save } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useGetForecastSettingsQuery } from "@/entities/ForecastSettings";
import type { ForecastSettingsRq } from "@/entities/ForecastSettings";
import { problemMessage } from "@/shared/api/problem";
import { toMoneyString, toNumber } from "@/shared/lib/format/money";
import { Button } from "@/shared/ui/Button/Button";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Select } from "@/shared/ui/Select/Select";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { toast } from "@/shared/ui/Toast/Toast";
import { useUpdateForecastSettingsMutation } from "../api/settingsMutationApi";

interface ForecastSettingsFormProps {
	companyId: string;
	accountId: string;
	disabled?: boolean;
}

/** Допустимые значения algorithm; любое другое бэк отклонит (422) */
const ALGORITHMS = [
	{ value: "WEEKDAY_MEAN_V1", label: "Среднее по дню недели", hint: "по умолчанию" },
	{ value: "WEEKDAY_ROBUST_V2", label: "Устойчивая модель", hint: "праздники РФ, выбросы, шумные дни" },
];

const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

/** Параметры расчёта. PUT полный, с If-Match текущей версии. Границы проверяет бэк (422 INVALID_SETTINGS). */
export const ForecastSettingsForm = memo(({ companyId, accountId, disabled }: ForecastSettingsFormProps) => {
	const { data, isLoading, error, refetch } = useGetForecastSettingsQuery({ companyId, accountId });
	const [update, state] = useUpdateForecastSettingsMutation();
	const [form, setForm] = useState<Record<keyof Omit<ForecastSettingsRq, "algorithm">, string>>({
		windowWeeks: "",
		horizonDays: "",
		bufferAmount: "",
		scenarioCount: "",
		minCalibrationOrigins: "",
		calibrationStepDays: "",
	});

	const [algorithm, setAlgorithm] = useState("");

	useEffect(() => {
		if (!data) return;
		setAlgorithm(data.algorithm);
		setForm({
			windowWeeks: String(data.windowWeeks),
			horizonDays: String(data.horizonDays),
			bufferAmount: String(toNumber(data.bufferAmount) ?? 0),
			scenarioCount: String(data.scenarioCount),
			minCalibrationOrigins: String(data.minCalibrationOrigins),
			calibrationStepDays: String(data.calibrationStepDays),
		});
	}, [data]);

	if (isLoading) return <Skeleton className="h-64" />;
	if (error || !data)
		return (
			<ErrorState
				error={error}
				onRetry={refetch}
			/>
		);

	const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
		setForm((f) => ({ ...f, [k]: e.target.value.replace(/[^\d.,\s]/g, "") }));

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const body: ForecastSettingsRq = {
			windowWeeks: Math.round(num(form.windowWeeks)),
			horizonDays: Math.round(num(form.horizonDays)),
			bufferAmount: toMoneyString(num(form.bufferAmount) || 0),
			scenarioCount: Math.round(num(form.scenarioCount)),
			minCalibrationOrigins: Math.round(num(form.minCalibrationOrigins)),
			calibrationStepDays: Math.round(num(form.calibrationStepDays)),
			algorithm: algorithm || data.algorithm,
		};
		const rs = await update({ companyId, accountId, version: data.version, body });
		if ("error" in rs) {
			toast.error(problemMessage(rs.error));
			void refetch();
		} else toast.success("Настройки сохранены — пересчитайте прогноз");
	};

	return (
		<form
			onSubmit={onSubmit}
			className="flex flex-col gap-5"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field
					label="Страховой буфер, ₽"
					hint="Остаток ниже этой суммы — тоже повод для предупреждения"
				>
					<Input
						inputMode="decimal"
						value={form.bufferAmount}
						onChange={set("bufferAmount")}
						disabled={disabled}
					/>
				</Field>
				<Field
					label="Горизонт прогноза, дней"
					hint="Сервис строит минимум 30 дней"
				>
					<Input
						inputMode="numeric"
						value={form.horizonDays}
						onChange={set("horizonDays")}
						disabled={disabled}
					/>
				</Field>
				<Field
					label="Окно истории, недель"
					hint="Сколько последних недель берём для оценки обычных потоков"
				>
					<Input
						inputMode="numeric"
						value={form.windowWeeks}
						onChange={set("windowWeeks")}
						disabled={disabled}
					/>
				</Field>
				<Field
					label="Сценариев для вероятности"
					hint="Число траекторий бутстрепа"
				>
					<Input
						inputMode="numeric"
						value={form.scenarioCount}
						onChange={set("scenarioCount")}
						disabled={disabled}
					/>
				</Field>
				<Field
					label="Минимум отсечек калибровки"
					hint="Меньше — вероятность помечается как неоткалиброванная"
				>
					<Input
						inputMode="numeric"
						value={form.minCalibrationOrigins}
						onChange={set("minCalibrationOrigins")}
						disabled={disabled}
					/>
				</Field>
				<Field label="Шаг калибровки, дней">
					<Input
						inputMode="numeric"
						value={form.calibrationStepDays}
						onChange={set("calibrationStepDays")}
						disabled={disabled}
					/>
				</Field>
			</div>
			<Field
				label="Алгоритм прогноза"
				hint="Чтобы прогноз и проверка качества были сопоставимы, запускайте их с одним алгоритмом. Сравнение обеих моделей — в бэктесте."
			>
				<Select
					value={algorithm || data.algorithm}
					onChange={setAlgorithm}
					disabled={disabled}
					options={
						ALGORITHMS.some((a) => a.value === data.algorithm)
							? ALGORITHMS
							: [...ALGORITHMS, { value: data.algorithm, label: data.algorithm, hint: "текущий" }]
					}
				/>
			</Field>
			<div className="flex flex-wrap items-center justify-end gap-3">
				<Button
					type="submit"
					disabled={disabled || state.isLoading}
				>
					<Save />
					Сохранить настройки
				</Button>
			</div>
		</form>
	);
});
