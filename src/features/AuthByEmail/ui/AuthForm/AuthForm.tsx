import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSelector } from "react-redux";
import { userActions } from "@/entities/User";
import { isProblemCode, problemMessage } from "@/shared/api/problem";
import { fadeUp, spring, tween } from "@/shared/config/motion";
import { DynamicModuleLoader } from "@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader";
import type { ReducersList } from "@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { AutoHeight } from "@/shared/ui/AutoHeight/AutoHeight";
import { Button } from "@/shared/ui/Button/Button";
import { CodeInput } from "@/shared/ui/CodeInput/CodeInput";
import type { CodeState } from "@/shared/ui/CodeInput/CodeInput";
import { DrawnCheck } from "@/shared/ui/DrawnCheck/DrawnCheck";
import { Field, Input } from "@/shared/ui/Input/Input";
import { useRequestCodeMutation, useVerifyCodeMutation } from "../../api/authApi";
import { getAuthChallenge, getAuthEmail, getAuthStep } from "../../model/selectors/authByEmailSelectors";
import { authByEmailActions, authByEmailReducer } from "../../model/slice/authByEmailSlice";

const initialReducers: ReducersList = {
	authByEmail: authByEmailReducer,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Секунды до возможности повторной отправки кода (resendAvailableAt с бэка) */
function useCountdown(until: string | undefined) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!until) return;
		const t = setInterval(() => setNow(Date.now()), 500);
		return () => clearInterval(t);
	}, [until]);
	return until ? Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000)) : 0;
}

interface AuthFormProps {
	onSuccess?: () => void;
}

const AuthFormInner = ({ onSuccess }: AuthFormProps) => {
	const dispatch = useAppDispatch();
	const step = useSelector(getAuthStep);
	const email = useSelector(getAuthEmail);
	const challenge = useSelector(getAuthChallenge);
	const [requestCode, requestState] = useRequestCodeMutation();
	const [verifyCode] = useVerifyCodeMutation();
	const [emailError, setEmailError] = useState<string | null>(null);
	const [code, setCode] = useState("");
	const [codeState, setCodeState] = useState<CodeState>("idle");
	const [codeError, setCodeError] = useState<string | null>(null);
	const resendIn = useCountdown(challenge?.resendAvailableAt);

	const sendCode = useCallback(async () => {
		const value = email.trim();
		if (!EMAIL_RE.test(value)) {
			setEmailError("Введите корректный email");
			return;
		}
		setEmailError(null);
		const rs = await requestCode({ email: value });
		if ("data" in rs && rs.data) {
			setCode("");
			setCodeState("idle");
			setCodeError(null);
			dispatch(authByEmailActions.codeSent(rs.data));
		} else {
			setEmailError(problemMessage(rs.error, "Не удалось отправить код"));
		}
	}, [dispatch, email, requestCode]);

	const onSubmitEmail = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			void sendCode();
		},
		[sendCode]
	);

	const onComplete = useCallback(
		async (value: string) => {
			if (!challenge) return;
			setCodeState("busy");
			setCodeError(null);
			const rs = await verifyCode({ challengeId: challenge.challengeId, code: value });
			if ("data" in rs && rs.data) {
				setCodeState("success");
				const user = rs.data.user;
				setTimeout(() => {
					dispatch(userActions.setAuthData(user));
					onSuccess?.();
				}, 900);
				return;
			}
			setCodeState("error");
			setCodeError(problemMessage(rs.error, "Неверный код"));
			if (isProblemCode(rs.error, "CODE_EXPIRED") || isProblemCode(rs.error, "CODE_ATTEMPTS_EXCEEDED")) {
				setCode("");
			} else {
				setTimeout(() => setCode(""), 450);
			}
		},
		[challenge, dispatch, onSuccess, verifyCode]
	);

	return (
		<AutoHeight>
			<AnimatePresence
				mode="wait"
				initial={false}
			>
				{step === "email" ? (
					<motion.form
						key="email"
						variants={fadeUp}
						initial="hidden"
						animate="show"
						exit="exit"
						onSubmit={onSubmitEmail}
						className="flex flex-col gap-5"
						noValidate
					>
						<Field
							label="Рабочий email"
							error={emailError}
							hint="Пришлём одноразовый код — пароль не нужен"
						>
							<Input
								type="email"
								inputMode="email"
								autoComplete="email"
								autoFocus
								placeholder="owner@company.ru"
								icon={<Mail />}
								value={email}
								onChange={(e) => dispatch(authByEmailActions.setEmail(e.target.value))}
							/>
						</Field>
						<Button
							type="submit"
							size="lg"
							variant="brand"
							block
							disabled={requestState.isLoading}
						>
							{requestState.isLoading ? "Отправляем…" : "Получить код"}
							<ArrowRight />
						</Button>
					</motion.form>
				) : (
					<motion.div
						key="code"
						variants={fadeUp}
						initial="hidden"
						animate="show"
						exit="exit"
						className="flex flex-col gap-5"
					>
						<div className="text-sm text-muted-foreground">
							Код из {challenge?.codeLength ?? 6} цифр отправлен на{" "}
							<span className="font-medium text-foreground">{email}</span>
						</div>
						<CodeInput
							length={challenge?.codeLength ?? 6}
							value={code}
							onChange={(v) => {
								setCode(v);
								if (codeState === "error") setCodeState("idle");
							}}
							onComplete={onComplete}
							state={codeState}
							autoFocus
							label="Код из письма"
						/>
						<AnimatePresence initial={false}>
							{codeError && (
								<motion.p
									key={codeError}
									initial={{ opacity: 0, y: -4 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									transition={{ ...spring.snappy, opacity: tween.fast }}
									className="text-sm text-danger"
									role="alert"
								>
									{codeError}
								</motion.p>
							)}
							{codeState === "success" && (
								<motion.div
									key="ok"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="flex items-center gap-3 text-sm font-medium text-success-soft-foreground"
								>
									<DrawnCheck className="size-8" />
									Готово, входим…
								</motion.div>
							)}
						</AnimatePresence>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<Button
								variant="quiet"
								size="sm"
								onClick={() => dispatch(authByEmailActions.changeEmail())}
								disabled={codeState === "busy" || codeState === "success"}
							>
								<ArrowLeft />
								Другой email
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => void sendCode()}
								disabled={resendIn > 0 || requestState.isLoading || codeState === "success"}
							>
								{resendIn > 0 ? `Отправить снова через ${resendIn} с` : "Отправить код снова"}
							</Button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</AutoHeight>
	);
};

export const AuthForm = memo((props: AuthFormProps) => (
	<DynamicModuleLoader
		reducers={initialReducers}
		removeAfterUnmount
	>
		<AuthFormInner {...props} />
	</DynamicModuleLoader>
));
