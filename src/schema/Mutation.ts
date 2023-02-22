import { booleanArg, idArg, intArg, mutationType, nonNull, stringArg } from "nexus";
import { createToken } from "../auth";
import {
	createGroup,
	createUser,
	joinGroup,
	leaveGroup,
	markUserReady,
	removeUser,
	submitAnswer,
} from "../impl";
import { AuthInfo } from "./AuthInfo";
import { Group } from "./Group";
import { Void } from "./Void";

export const Mutation = mutationType({
	definition(t) {
		t.field("createUser", {
			type: nonNull(AuthInfo),
			args: { name: nonNull(stringArg()) },
			resolve(_, { name }) {
				const user = createUser(name);
				const token = createToken(user.id);
				return { user, token };
			},
		});
		t.field("createGroup", {
			type: Group,
			resolve(_, __, { userId }) {
				if (!userId) return null;
				return createGroup(userId) || null;
			},
		});
		t.field("submitAnswer", {
			type: Void,
			args: {
				answerIndex: nonNull(intArg()),
			},
			resolve(_, { answerIndex }, { userId }) {
				return submitAnswer(userId!, answerIndex);
			},
		});
		t.field("joinGroup", {
			type: Group,
			args: {
				groupId: nonNull(idArg()),
			},
			resolve(_, { groupId }, { userId }) {
				return joinGroup(userId!, groupId) ?? null;
			},
		});
		t.field("leaveGroup", {
			type: Void,
			resolve(_, __, { userId }) {
				leaveGroup(userId!);
			},
		});
		t.field("markUserReady", {
			type: Void,
			args: {
				ready: nonNull(booleanArg()),
			},
			resolve(_, { ready }, { userId }) {
				markUserReady(userId!, ready);
			},
		});
		t.field("logout", {
			type: Void,
			resolve(_, __, { userId }) {
				leaveGroup(userId!);
				removeUser(userId!);
			},
		});
	},
});
