import type { Action, ThunkDispatch } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";

// Типы стора объявлены здесь, а не в app, чтобы нижние слои не импортировали app (правило FSD).

export type AppStateLike = Record<string, any>;
export type AppDispatch = ThunkDispatch<AppStateLike, unknown, Action>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<AppStateLike> = useSelector;
