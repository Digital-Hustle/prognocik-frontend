import { AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { dataAsOfDate, useGetAccountQuery, useGetCompanyQuery } from "@/entities/Company";
import { useGetDashboardQuery } from "@/entities/Forecast";
import type { OneCSyncReport } from "@/entities/OneC";
import { RunForecastButton } from "@/features/RunForecast";
import { OneCSyncPanel, OneCSyncResult } from "@/features/SyncOneC";
import { fadeUp } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { addDays } from "@/shared/lib/date/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { Status } from "@/shared/ui/Status/Status";

export const OneCIntegration = ({ companyId, accountId }: { companyId: string; accountId: string }) => {
	const company = useGetCompanyQuery(companyId);
	const account = useGetAccountQuery({ companyId, accountId });
	const dashboard = useGetDashboardQuery({ companyId, accountId });
	const [report, setReport] = useState<OneCSyncReport | null>(null);
	const perms = company.data?.permissions;
	const asOf = dataAsOfDate(account.data, dashboard.data?.asOfDate);
	const stale = report?.dataChanged && !report.dryRun;

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
					<p className="flex-1 text-sm">Планы из 1С изменились — прогноз устарел. Пересчитайте его.</p>
					{perms?.canRunForecast && (
						<RunForecastButton
							companyId={companyId}
							accountId={accountId}
							asOfDate={asOf}
							withScope={false}
							label="Пересчитать прогноз"
						/>
					)}
				</motion.div>
			)}

			<motion.div
				variants={fadeUp}
				initial="hidden"
				animate="show"
				className="grid grid-cols-1 gap-4 lg:grid-cols-5"
			>
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Загрузка из 1С</CardTitle>
						<Status tone="info">демо-источник</Status>
					</CardHeader>
					<CardContent>
						<OneCSyncPanel
							key={asOf}
							companyId={companyId}
							accountId={accountId}
							defaultFrom={addDays(asOf, 1)}
							canSync={perms?.canManagePlans ?? false}
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
							<OneCSyncResult report={report} />
						) : (
							<p className="text-sm text-muted-foreground">
								Запустите «Предпросмотр» — покажем, какие документы появятся, ничего не записывая.
								Загруженное попадёт в{" "}
								<Link
									className="text-primary underline underline-offset-2"
									to={RoutePath.plans}
								>
									планы
								</Link>{" "}
								с пометкой «1С · демо».
							</p>
						)}
					</CardContent>
				</Card>
			</motion.div>

			<Card>
				<CardContent className="text-sm text-muted-foreground">
					Реальной 1С пока нет: сервер отдаёт фиксированный реестр из трёх документов — налог по УСН, счёт
					поставщика и счёт покупателю. Это показывает формат: документы приходят обычными планами с номером и
					датой выставления. Повторная загрузка безопасна, а изменённые вручную планы не перезаписываются.
				</CardContent>
			</Card>
		</div>
	);
};
