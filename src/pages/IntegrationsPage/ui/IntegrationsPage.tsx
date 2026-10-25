import { Boxes, CheckCircle2, Clock, Plug } from "lucide-react";
import { motion } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";
import { useGetBitrixStatusQuery } from "@/entities/Bitrix24";
import { useWorkspace } from "@/entities/Workspace";
import { fadeUp, liftArea, liftItem, stagger } from "@/shared/config/motion";
import { RoutePath } from "@/shared/const/router";
import { cn } from "@/shared/lib/cn/cn";
import { formatInstant } from "@/shared/lib/date/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { PageHeader } from "@/shared/ui/PageHeader/PageHeader";
import { Status } from "@/shared/ui/Status/Status";
import { BitrixIntegration } from "@/widgets/BitrixIntegration";
import { OneCIntegration } from "@/widgets/OneCIntegration";
import { INTEGRATIONS } from "../model/catalog";
import type { IntegrationCard, IntegrationId } from "../model/catalog";

const Soon = ({ card }: { card: IntegrationCard }) => (
	<Card>
		<CardHeader>
			<CardTitle className="flex items-center gap-2">
				{card.name}
				<Status tone="neutral">
					<Clock />
					скоро
				</Status>
			</CardTitle>
		</CardHeader>
		<CardContent className="flex flex-col gap-4">
			<p className="text-sm text-muted-foreground">{card.how}</p>
			<div>
				<h3 className="pb-2 text-sm font-semibold">Что даст прогнозу</h3>
				<ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
					{card.gives.map((g) => (
						<li
							key={g}
							className="flex items-start gap-2"
						>
							<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-subtle-foreground" />
							{g}
						</li>
					))}
				</ul>
			</div>
			<p className="text-xs text-muted-foreground">
				Интеграция ещё не подключена. Пока данные можно добавить вручную:{" "}
				<Link
					className="text-primary underline underline-offset-2"
					to={RoutePath.plans}
				>
					планы
				</Link>{" "}
				и{" "}
				<Link
					className="text-primary underline underline-offset-2"
					to={RoutePath.import}
				>
					выписки
				</Link>
				.
			</p>
		</CardContent>
	</Card>
);

const IntegrationsPage = () => {
	const { companyId, accountId } = useWorkspace();
	const [params, setParams] = useSearchParams();
	const selected = INTEGRATIONS.find((i) => i.id === params.get("i")) ?? INTEGRATIONS[0];
	const bitrix = useGetBitrixStatusQuery({ companyId, accountId });
	const choose = (id: IntegrationId) => setParams({ i: id }, { replace: true });

	const live = (c: IntegrationCard) => {
		if (c.id !== "bitrix24" || !bitrix.data) return null;
		return bitrix.data.lastSyncedAt
			? `${bitrix.data.activePlans} планов · ${formatInstant(bitrix.data.lastSyncedAt)}`
			: "Не синхронизировалась";
	};

	return (
		<div className="flex flex-col gap-4 sm:gap-5">
			<PageHeader
				kicker="Подключения"
				title="Интеграции"
				sub="Откуда прогноз берёт деньги, которых ещё нет в выписке: CRM, учётные системы, маркетплейсы. У каждой свой формат подключения."
			/>

			<motion.ul
				variants={stagger(0.05)}
				initial="hidden"
				animate="show"
				className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 xl:grid-cols-3"
			>
				{INTEGRATIONS.map((c) => {
					const on = c.id === selected.id;
					const extra = live(c);
					return (
						<motion.li
							key={c.id}
							variants={fadeUp}
							{...liftArea}
						>
							<motion.button
								variants={liftItem}
								type="button"
								onClick={() => choose(c.id)}
								aria-pressed={on}
								className={cn(
									"flex h-full w-full flex-col gap-3 rounded-lg bg-card p-4 text-left shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5",
									on && "ring-2 ring-brand"
								)}
							>
								<span className="flex items-center gap-3">
									<span
										className={cn(
											"flex size-11 shrink-0 items-center justify-center rounded-md [&_svg]:size-5",
											c.available ? "bg-hero text-lime" : "bg-surface text-muted-foreground"
										)}
									>
										{c.available ? <Plug /> : <Boxes />}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold">{c.name}</span>
										<span className="block truncate text-xs text-muted-foreground">{c.kind}</span>
									</span>
									<Status tone={c.available ? "success" : "neutral"}>
										{c.available ? "доступна" : "скоро"}
									</Status>
								</span>
								<span className="text-sm text-muted-foreground">{c.short}</span>
								{extra && <span className="text-xs font-medium text-brand">{extra}</span>}
							</motion.button>
						</motion.li>
					);
				})}
			</motion.ul>

			<motion.div
				key={selected.id}
				variants={fadeUp}
				initial="hidden"
				animate="show"
			>
				{selected.id === "bitrix24" ? (
					<BitrixIntegration
						companyId={companyId}
						accountId={accountId}
					/>
				) : selected.id === "1c" ? (
					<OneCIntegration
						companyId={companyId}
						accountId={accountId}
					/>
				) : (
					<Soon card={selected} />
				)}
			</motion.div>
		</div>
	);
};

export default IntegrationsPage;
