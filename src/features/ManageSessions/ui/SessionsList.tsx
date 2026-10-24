import { LogOut, MonitorSmartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import { useGetSessionsQuery } from "@/entities/User";
import { problemMessage } from "@/shared/api/problem";
import { fadeUp, tween } from "@/shared/config/motion";
import { formatInstant } from "@/shared/lib/date/date";
import { Button } from "@/shared/ui/Button/Button";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { Status } from "@/shared/ui/Status/Status";
import { toast } from "@/shared/ui/Toast/Toast";
import { useRevokeAllSessionsMutation, useRevokeSessionMutation } from "../api/sessionsApi";

interface SessionsListProps {
	/** Отзыв всех сессий завершает и текущую — дальше нужен выход */
	onAllRevoked?: () => void;
}

export const SessionsList = memo(({ onAllRevoked }: SessionsListProps) => {
	const { data, isLoading, error, refetch } = useGetSessionsQuery();
	const [revoke, revokeState] = useRevokeSessionMutation();
	const [revokeAll, revokeAllState] = useRevokeAllSessionsMutation();

	if (isLoading)
		return (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
			</div>
		);
	if (error)
		return (
			<ErrorState
				error={error}
				onRetry={refetch}
			/>
		);

	const items = data?.items ?? [];

	return (
		<div className="flex flex-col gap-3">
			<ul className="flex flex-col gap-1">
				<AnimatePresence initial={false}>
					{items.map((s) => (
						<motion.li
							key={s.id}
							layout
							variants={fadeUp}
							initial="hidden"
							animate="show"
							exit={{ opacity: 0, height: 0, transition: tween.exit }}
							className="flex items-center gap-3 rounded-md bg-muted px-3 py-3"
						>
							<span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface text-muted-foreground">
								<MonitorSmartphone className="size-4.5" />
							</span>
							<div className="min-w-0 flex-1 text-sm">
								<div className="flex items-center gap-2 font-medium">
									Вход {formatInstant(s.createdAt)}
									{s.current && <Status tone="success">Это устройство</Status>}
								</div>
								<div className="text-xs text-muted-foreground">
									Активность {formatInstant(s.lastSeenAt)} · до {formatInstant(s.expiresAt)}
								</div>
							</div>
							{!s.current && (
								<Button
									variant="quiet"
									size="sm"
									disabled={revokeState.isLoading}
									onClick={async () => {
										const rs = await revoke(s.id);
										if ("error" in rs) toast.error(problemMessage(rs.error));
										else toast.success("Сессия завершена");
									}}
								>
									Завершить
								</Button>
							)}
						</motion.li>
					))}
				</AnimatePresence>
			</ul>
			{items.length > 1 && (
				<Button
					variant="danger-soft"
					size="sm"
					className="self-start"
					disabled={revokeAllState.isLoading}
					onClick={async () => {
						const rs = await revokeAll();
						if ("error" in rs) toast.error(problemMessage(rs.error));
						else onAllRevoked?.();
					}}
				>
					<LogOut />
					Выйти на всех устройствах
				</Button>
			)}
		</div>
	);
});
