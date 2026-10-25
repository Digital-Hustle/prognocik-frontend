import { useEffect } from "react";
import { useSelector } from "react-redux";
import { AppRouter } from "@/app/providers/router";
import { getUserInited, userApi } from "@/entities/User";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { Aurora } from "@/shared/ui/Aurora/Aurora";
import { Toaster } from "@/shared/ui/Toast/Toast";
import { AssistantChat } from "@/widgets/AssistantChat";
import { PageLoader } from "@/widgets/PageLoader";

function App() {
	const dispatch = useAppDispatch();
	const inited = useSelector(getUserInited);

	// Сессия в HttpOnly cookies: узнаём, вошёл ли пользователь, запросом профиля (при 401 — один refresh)
	useEffect(() => {
		const request = dispatch(userApi.endpoints.getMe.initiate());
		return () => request.unsubscribe();
	}, [dispatch]);

	return (
		<div className="app relative isolate min-h-dvh">
			<Aurora fixed />
			<Toaster />
			{inited ? <AppRouter /> : <PageLoader fullscreen />}
			{inited && <AssistantChat />}
		</div>
	);
}

export default App;
