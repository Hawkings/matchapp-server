import { enumType } from "nexus";

export enum GState {
	WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
	IN_PROGRESS = "IN_PROGRESS",
	SHOWING_RESULTS = "SHOWING_RESULTS",
	FINAL_RESULTS = "FINAL_RESULTS",
}

export const GroupState = enumType({
	name: "GroupState",
	members: ["WAITING_FOR_PLAYERS", "IN_PROGRESS", "SHOWING_RESULTS", "FINAL_RESULTS"],
});
