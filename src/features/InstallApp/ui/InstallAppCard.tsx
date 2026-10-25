import { Download, Share } from "lucide-react";
import { motion } from "motion/react";
import { fadeUp } from "@/shared/config/motion";
import { Button } from "@/shared/ui/Button/Button";
import { Card, CardHeader, CardTitle } from "@/shared/ui/Card/Card";
import { isIos, promptInstall, useInstallPrompt } from "../model/installPrompt";

/** Установка на экран «Домой». Chrome/Edge/Android — кнопкой; iOS Safari не умеет, показываем подсказку. */
export const InstallAppCard = () => {
	const { canInstall, installed } = useInstallPrompt();
	if (installed) return null;
	const ios = isIos();
	if (!canInstall && !ios) return null;
	return (
		<motion.div variants={fadeUp}>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Download className="size-5" />
						Приложение
					</CardTitle>
				</CardHeader>
				<div className="flex flex-col gap-3 p-4 sm:p-6">
					<p className="text-sm text-muted-foreground">
						Откроется в отдельном окне, как обычное приложение, и будет под рукой на главном экране.
					</p>
					{canInstall ? (
						<Button
							variant="brand"
							className="self-start"
							onClick={() => void promptInstall()}
						>
							<Download />
							Установить
						</Button>
					) : (
						<p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-sm">
							<Share className="mt-0.5 size-4 shrink-0" />
							<span>В Safari нажмите «Поделиться», затем «На экран Домой».</span>
						</p>
					)}
				</div>
			</Card>
		</motion.div>
	);
};
