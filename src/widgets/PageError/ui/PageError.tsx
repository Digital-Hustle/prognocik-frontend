import { RotateCcw } from "lucide-react";
import { memo } from "react";
import { Button } from "@/shared/ui/Button/Button";
import { Card } from "@/shared/ui/Card/Card";
import { Logo } from "@/shared/ui/Logo/Logo";

export const PageError = memo(() => (
	<div className="flex min-h-dvh items-center justify-center p-6">
		<Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
			<Logo />
			<h1 className="font-display text-2xl">Что-то пошло не так</h1>
			<p className="text-sm text-muted-foreground">
				Интерфейс столкнулся с ошибкой. Данные на сервере не пострадали — обновите страницу.
			</p>
			<Button onClick={() => location.reload()}>
				<RotateCcw />
				Обновить страницу
			</Button>
		</Card>
	</div>
));
