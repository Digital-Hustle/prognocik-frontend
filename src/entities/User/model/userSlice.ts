import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { sessionExpired } from "@/shared/api/rtkApi";
import type { Profile, UserSchema } from "./types";
import { userApi } from "../api/userApi";

const initialState: UserSchema = {
	authData: null,
	inited: false,
};

export const userSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		setAuthData: (state, action: PayloadAction<Profile>) => {
			state.authData = action.payload;
			state.inited = true;
		},
		logout: (state) => {
			state.authData = null;
			state.inited = true;
		},
		setInited: (state) => {
			state.inited = true;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(sessionExpired, (state) => {
				state.authData = null;
				state.inited = true;
			})
			.addMatcher(userApi.endpoints.getMe.matchFulfilled, (state, action) => {
				state.authData = action.payload;
				state.inited = true;
			})
			.addMatcher(userApi.endpoints.getMe.matchRejected, (state, action) => {
				// Отмену запроса (условие/дедупликация) за выход не считаем
				if (action.meta.condition) return;
				state.inited = true;
			});
	},
});

export const { actions: userActions } = userSlice;
export const { reducer: userReducer } = userSlice;
