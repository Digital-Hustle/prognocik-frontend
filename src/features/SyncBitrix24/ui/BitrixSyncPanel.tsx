import { Eye, FlaskConical, RefreshCw, ShieldCheck } from "lucide-react";
import { memo, useState } from "react";
import { BITRIX_HORIZONS } from "@/entities/Bitrix24";
import type { BitrixMode, BitrixStatus, BitrixSyncReport, BitrixSyncRq } from "@/entities/Bitrix24";
import { problemMessage } from "@/shared/api/problem";
import { Button } from "@/shared/ui/Button/Button";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Segmented } from "@/shared/ui/Segmented/Segmented";
import { SwitchRow } from "@/shared/ui/Switch/Switch";
import { toast } from "@/shared/ui/Toast/Toast";
import { useSyncBitrixMutation } from "../api/syncBitrixApi";

interface Props {
	companyId: string;
	accountId: string;
	status: BitrixStatus | undefined;
	/** Начало окна: день после последних данных счёта, чтобы планы попали в прогноз */
	fromDate: string;
	canSync: boolean;
	onReport: (report: BitrixSyncReport) => void;
}

type Run = "preview" | "sync" | "demo";

/**
 * Параметры синхронизации. Адрес вебхука — секрет: поле type=password, живёт только в состоянии этого компонента,
 * не пишется в storage, URL, логи и тосты, а сервер его тоже не сохраняет.
 */
export const BitrixSyncPanel = memo(({ companyId, accountId, status, fromDate, canSync, onReport }: Props) => {
	const [sync, state] = useSyncBitrixMutation();
	const [webhook, setWebhook] = useState("");
	const [horizon, setHorizon] = useState<number>(30);
	const [deals, setDeals] = useState(true);
	const [invoices, setInvoices] = useState(true);
	const [weighted, setWeighted] = useState(false);
	const [running, setRunning] = useState<Run | null>(null);
	const [error, setError] = useState<string | null>(null);

	const needHook = !status?.webhookConfigured;
	const hookOk = /^https:\/\/\S+$/i.test(webhook.trim());

	const run = async (kind: Run) => {
		setError(null);
		if (!deals && !invoices) return setError("Включите хотя бы один тип документов: сделки или счета.");
		if (kind !== "demo" && !webhook.trim() && needHook)
			return setError("Вставьте адрес входящего вебхука Битрикс24 — или запустите на демо-данных.");
		if (kind !== "demo" && webhook.trim() && !hookOk)
			return setError("Адрес вебхука должен начинаться с https:// и не содержать пробелов.");
		const body: BitrixSyncRq = {
			mode: (kind === "demo" ? "DEMO" : "LIVE") satisfies BitrixMode,
			horizonDays: horizon,
			fromDate,
			includeDeals: deals,
			includeInvoices: invoices,
			weightByProbability: weighted,
			dryRun: kind === "preview",
		};
		if (kind !== "demo" && webhook.trim()) body.webhookUrl = webhook.trim();
		setRunning(kind);
		const rs = await sync({ companyId, accountId, body });
		setRunning(null);
		if ("error" in rs) return setError(problemMessage(rs.error));
		onReport(rs.data);
		toast.success(
			kind === "preview"
				? "Предпросмотр готов: данные не менялись"
				: rs.data.dataChanged
					? "Планы обновлены. Прогноз нужно пересчитать"
					: "Синхронизация завершена: изменений нет"
		);
	};

	const busy = state.isLoading;
	return (
		<form
			className="flex flex-col gap-5"
			onSubmit={(e) => {
				e.preventDefault();
				void run("sync");
			}}
			autoComplete="off"
		>
			<Field
				label="Адрес входящего вебхука"
				hint={
					status?.webhookConfigured
						? `На сервере уже задан портал ${status.configuredPortal ?? ""}. Поле можно оставить пустым.`
						: "Битрикс24 → Разработчикам → Другое → Входящий вебхук. Права: CRM. Адрес не сохраняется."
				}
			>
				<Input
					type="password"
					autoComplete="off"
					spellCheck={false}
					maxLength={300}
					placeholder="https://company.bitrix24.ru/rest/1/xxxxxxxx/"
					value={webhook}
					onChange={(e) => setWebhook(e.target.value)}
					disabled={!canSync || busy}
					icon={<ShieldCheck />}
				/>
			</Field>

			<div className="flex flex-col gap-1.5">
				<span className="text-sm font-medium">Горизонт, дней</span>
				<Segmented
					block
					value={String(horizon)}
					onChange={(v) => setHorizon(Number(v))}
					label="Горизонт синхронизации"
					options={BITRIX_HORIZONS.map((d) => ({ value: String(d), label: String(d) }))}
				/>
			</div>

			<div className="flex flex-col divide-y divide-border rounded-md border border-border">
				<SwitchRow
					title="Сделки"
					text="Открытые сделки с суммой и сроком — ожидаемые поступления"
					checked={deals}
					onChange={setDeals}
				/>
				<SwitchRow
					title="Счета"
					text="Выставленные счета, ожидающие оплаты"
					checked={invoices}
					onChange={setInvoices}
				/>
				<SwitchRow
					title="Взвешивать по вероятности"
					text="Сумма плана = сумма сделки × вероятность закрытия"
					checked={weighted}
					onChange={setWeighted}
				/>
			</div>

			{error && (
				<p
					role="alert"
					className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
				>
					{error}
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="outline"
					disabled={!canSync || busy}
					onClick={() => void run("preview")}
				>
					<Eye />
					{running === "preview" ? "Смотрим…" : "Предпросмотр"}
				</Button>
				<Button
					type="submit"
					variant="brand"
					disabled={!canSync || busy}
				>
					<RefreshCw />
					{running === "sync" ? "Синхронизируем…" : "Синхронизировать"}
				</Button>
				{status?.demoAvailable !== false && (
					<Button
						type="button"
						variant="quiet"
						disabled={!canSync || busy}
						onClick={() => void run("demo")}
					>
						<FlaskConical />
						{running === "demo" ? "Загружаем…" : "Демо-данные"}
					</Button>
				)}
			</div>
			{!canSync && (
				<p className="text-xs text-muted-foreground">
					Синхронизировать могут владелец и бухгалтер компании. У вас доступ только для чтения.
				</p>
			)}
		</form>
	);
});
