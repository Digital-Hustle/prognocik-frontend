import { Save } from "lucide-react";
import { memo, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useGetMeQuery, userActions } from "@/entities/User";
import { problemMessage } from "@/shared/api/problem";
import { useAppDispatch } from "@/shared/lib/hooks/useAppDispatch/useAppDispatch";
import { Button } from "@/shared/ui/Button/Button";
import { Field, Input } from "@/shared/ui/Input/Input";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { toast } from "@/shared/ui/Toast/Toast";
import { useUpdateProfileMutation } from "../api/profileApi";

export const EditProfileForm = memo(() => {
	const dispatch = useAppDispatch();
	const { data: me, isLoading, refetch } = useGetMeQuery();
	const [update, state] = useUpdateProfileMutation();
	const [name, setName] = useState("");

	useEffect(() => {
		if (me) setName(me.displayName ?? "");
	}, [me]);

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!me || !name.trim()) return;
		const rs = await update({ displayName: name.trim(), version: me.version });
		if ("data" in rs && rs.data) {
			dispatch(userActions.setAuthData(rs.data));
			toast.success("Имя сохранено");
		} else {
			toast.error(problemMessage(rs.error));
			void refetch();
		}
	};

	if (isLoading || !me) return <Skeleton className="h-control-md w-full" />;

	return (
		<form
			onSubmit={onSubmit}
			className="flex flex-col gap-4 sm:flex-row sm:items-end"
		>
			<Field
				label="Как к вам обращаться"
				className="flex-1"
			>
				<Input
					value={name}
					maxLength={120}
					onChange={(e) => setName(e.target.value)}
					placeholder="Имя и фамилия"
				/>
			</Field>
			<Button
				type="submit"
				disabled={state.isLoading || !name.trim() || name.trim() === (me.displayName ?? "")}
			>
				<Save />
				Сохранить
			</Button>
		</form>
	);
});
