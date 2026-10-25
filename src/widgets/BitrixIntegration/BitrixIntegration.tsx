import { AlertTriangle, ArrowRight, CheckCircle2, Plug } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useGetBitrixStatusQuery } from "@/entities/Bitrix24";
import type { BitrixSyncReport } from "@/entities/Bitrix24";
import { dataAsOfDate, useGetAccountQuery, useGetCompanyQuery } from "@/entities/Company";
import { useGetDashboardQuery } from "@/entities/Forecast";
import { RunForecastButton } from "@/features/RunForecast";
import { BitrixSyncPanel, BitrixSyncResult } from "@/features/SyncBitrix24";
import { fadeUp, stagger } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { formatInstant } from "@/shared/lib/date/date";
import { formatMoney } from "@/shared/lib/format/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Stat } from "@/shared/ui/Stat/Stat";
import { Status } from "@/shared/ui/Status/Status";

export const BitrixIntegration = ({ companyId, accountId }: { companyId: string; accountId: string }) => {
	const company = useGetCompanyQuery(companyId);
	const account = useGetAccountQuery({ companyId, accountId });
	const dashboard = useGetDashboardQuery({ companyId, accountId });
	const status = useGetBitrixStatusQuery({ companyId, accountId });
	const [report, setReport] = useState<BitrixSyncReport | null>(null);
	const perms = company.data?.permissions;
	const canSync = perms?.canManagePlans ?? false;
	const canForecast = perms?.canRunForecast ?? false;
	const s = status.data;
	const stale = report?.dataChanged && !report.dryRun;
	const runAsOf = dataAsOfDate(account.data, dashboard.data?.asOfDate);

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			{stale && (
				<motion.div
					role="status"
					initial={{ opacity: 0, y: -6 }}
					animate={{ opacity: 1, y: 0 }}
					className="flex flex-col gap-3 rounded-lg bg-warning-soft p-4 text-warning-soft-foreground sm:flex-row sm:items-center"
				>
					<AlertTriangle className="size-5 shrink-0" />
					<p className="flex-1 text-sm">
						Планы из Битрикс24 изменились — прогноз устарел. Пересчитайте его, чтобы учесть новые суммы и
						даты.
					</p>
					{canForecast && (
						<RunForecastButton
							companyId={companyId}
							accountId={accountId}
							asOfDate={runAsOf}
							withScope={false}
							label="Пересчитать прогноз"
						/>
					)}
				</motion.div>
			)}

			{status.isLoading ? (
				<Skeleton className="h-28 rounded-xl" />
			) : status.error ? (
				<Card>
					<ErrorState
						error={status.error}
						onRetry={status.refetch}
					/>
				</Card>
			) : (
				s && (
					<motion.dl
						variants={stagger(0.05)}
						initial="hidden"
						animate="show"
						className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3"
					>
						<Stat
							label="Планов из Битрикс24"
							value={s.activePlans}
							icon={<Plug />}
							sub="сейчас активны"
						/>
						<Stat
							tone="hero"
							label="Ожидаем поступлений"
							value={`+${formatMoney(s.activeAmount)}`}
							icon={<ArrowRight />}
						/>
						<Stat
							label="Последняя синхронизация"
							value={s.lastSyncedAt ? formatInstant(s.lastSyncedAt) : "не было"}
							icon={<CheckCircle2 />}
							sub={s.webhookConfigured ? `Портал ${s.configuredPortal ?? "задан на сервере"}` : undefined}
						/>
					</motion.dl>
				)
			)}

			<motion.div
				variants={fadeUp}
				initial="hidden"
				animate="show"
				className="grid grid-cols-1 gap-4 lg:grid-cols-5"
			>
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Синхронизация</CardTitle>
						{s && (
							<Status tone={s.webhookConfigured ? "success" : "neutral"}>
								{s.webhookConfigured ? "Вебхук на сервере" : "Вебхук вводится вручную"}
							</Status>
						)}
					</CardHeader>
					<CardContent>
						<BitrixSyncPanel
							companyId={companyId}
							accountId={accountId}
							status={s}
							canSync={canSync}
							onReport={setReport}
						/>
					</CardContent>
				</Card>

				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle>Результат</CardTitle>
					</CardHeader>
					<CardContent>
						{report ? (
							<BitrixSyncResult report={report} />
						) : (
							<p className="text-sm text-muted-foreground">
								Запустите «Предпросмотр» — мы покажем, что изменится, ничего не записывая.
								Подтверждённые изменения появятся в{" "}
								<Link
									className="text-primary underline underline-offset-2"
									to={RoutePath.plans}
								>
									планах
								</Link>{" "}
								с пометкой «Битрикс24».
							</p>
						)}
					</CardContent>
				</Card>
			</motion.div>

			<Card>
				<CardContent className="text-sm text-muted-foreground">
					Ручные правки планов из Битрикс24 перезаписываются при следующей синхронизации: источник правды —
					CRM. Аннулированные планы возобновляются, если сделка снова открыта. Вебхук не сохраняется ни в
					браузере, ни на сервере.
				</CardContent>
			</Card>
		</div>
	);
};
