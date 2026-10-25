import { CalendarPlus, ChevronDown, ExternalLink, Landmark } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { TAX_AUDIENCE_LABEL, useGetTaxCalendarQuery } from "@/entities/TaxCalendar";
import type { TaxCalendarItem } from "@/entities/TaxCalendar";
import { cn } from "@/shared/lib/cn/cn";
import { formatDayShort, formatRelativeDays, todayIso } from "@/shared/lib/date/date";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";

const PREVIEW = 4;

interface Props {
	companyId: string;
	/** Можно ли заводить планы (canManagePlans) */
	canCreate: boolean;
	onCreatePlan: (item: TaxCalendarItem) => void;
}

/**
 * Налоговый календарь — справочник сроков, без сумм. Сумму знает бухгалтер: «Создать план» открывает форму
 * с предзаполненными названием и датой и source=TAX.
 */
export const TaxCalendar = memo(({ companyId, canCreate, onCreatePlan }: Props) => {
	const today = todayIso();
	const year = Number(today.slice(0, 4));
	const current = useGetTaxCalendarQuery({ companyId, year }, { skip: !companyId });
	const next = useGetTaxCalendarQuery({ companyId, year: year + 1 }, { skip: !companyId || !current.isSuccess });
	const [all, setAll] = useState(false);

	const upcoming = useMemo(
		() =>
			[...(current.data?.items ?? []), ...(next.data?.items ?? [])]
				.filter((i) => i.dueDate >= today)
				.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
		[current.data, next.data, today]
	);
	const shown = all ? upcoming : upcoming.slice(0, PREVIEW);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Landmark className="size-5 text-muted-foreground" />
					Налоговый календарь
				</CardTitle>
				<span className="text-xs text-muted-foreground">справочно, без сумм</span>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{current.isLoading ? (
					<Skeleton className="h-24 rounded-lg" />
				) : current.error ? (
					<ErrorState
						error={current.error}
						onRetry={current.refetch}
					/>
				) : upcoming.length === 0 ? (
					<p className="text-sm text-muted-foreground">Ближайших сроков в календаре нет.</p>
				) : (
					<>
						<ul className="flex flex-col divide-y divide-border">
							{shown.map((i) => (
								<li
									key={`${i.taxCode}:${i.dueDate}:${i.title}`}
									className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
								>
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-muted py-1.5">
											<span className="font-display text-lg leading-tight font-semibold">
												{i.dueDate.slice(8)}
											</span>
											<span className="text-xs text-muted-foreground">
												{formatDayShort(i.dueDate).split(" ")[1]}
											</span>
										</div>
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium text-pretty">{i.title}</div>
											<div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
												<Status>{TAX_AUDIENCE_LABEL[i.audience]}</Status>
												<span>{formatRelativeDays(i.dueDate)}</span>
												{i.sourceUrl && (
													<a
														href={i.sourceUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
													>
														Источник <ExternalLink className="size-3" />
													</a>
												)}
											</div>
										</div>
									</div>
									{canCreate && (
										<Button
											size="sm"
											variant="outline"
											className="self-start sm:self-center"
											onClick={() => onCreatePlan(i)}
										>
											<CalendarPlus />
											Создать план
										</Button>
									)}
								</li>
							))}
						</ul>
						{upcoming.length > PREVIEW && (
							<Button
								variant="quiet"
								size="sm"
								className="self-start"
								onClick={() => setAll((v) => !v)}
							>
								<ChevronDown className={cn("transition-transform", all && "rotate-180")} />
								{all ? "Свернуть" : `Показать все (${upcoming.length})`}
							</Button>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
});
