import { enumType } from "nexus";

export enum QType {
	AGREE = "AGREE",
	DISAGREE = "DISAGREE",
}

export const QuestionType = enumType({
	name: "QuestionType",
	members: ["AGREE", "DISAGREE"],
});
