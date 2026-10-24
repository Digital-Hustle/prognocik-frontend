import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { CodeChallenge } from "@/entities/User";
import type { AuthByEmailSchema } from "../types/authByEmailSchema";

const initialState: AuthByEmailSchema = {
	step: "email",
	email: "",
	challenge: null,
};

export const authByEmailSlice = createSlice({
	name: "authByEmail",
	initialState,
	reducers: {
		setEmail: (state, action: PayloadAction<string>) => {
			state.email = action.payload;
		},
		codeSent: (state, action: PayloadAction<CodeChallenge>) => {
			state.challenge = action.payload;
			state.step = "code";
		},
		changeEmail: (state) => {
			state.step = "email";
			state.challenge = null;
		},
	},
});

export const { actions: authByEmailActions } = authByEmailSlice;
export const { reducer: authByEmailReducer } = authByEmailSlice;
