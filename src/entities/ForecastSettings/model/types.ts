import type { Money } from "@/shared/api/types";

/** SettingsRs */
export interface ForecastSettings {
	windowWeeks: number;
	horizonDays: number;
	bufferAmount: Money;
	scenarioCount: number;
	minCalibrationOrigins: number;
	calibrationStepDays: number;
	algorithm: string;
	version: number;
}

/** SettingsRq — все поля обязательны */
export type ForecastSettingsRq = Omit<ForecastSettings, "version">;
