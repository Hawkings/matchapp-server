import { NexusGenObjects } from "./schema/nexus-typegen";
import { QType } from "./schema/QuestionType";
import { PromiseResolver, randomIntBetween, sleep } from "./util";
import { PubSub } from "graphql-subscriptions";
import { GState } from "./schema/GroupState";
import { getRandomEmoji } from "./emoji";

type G = NexusGenObjects["Group"];
interface Group extends G {
	question?: Question | null | undefined;
	readyUsers: Set<string>;
}
type User = NexusGenObjects["User"];
type Q = NexusGenObjects["Question"];
interface Question extends Q {
	submittedAnswers: Map<string, number>;
	resolver: () => void;
}

export enum Event {
	GROUP_UPDATED = "GROUP_UPDATED",
}

interface EventToResult {
	[Event.GROUP_UPDATED]: Group;
}

type EventResult<E extends Event> = Event extends keyof EventToResult ? EventToResult[E] : never;

const groups: Map<string, Group> = new Map();
const users: Map<string, User> = new Map();
const pubSub = new PubSub();
let lastGroupId = 0;
let lastUserId = 0;
let lastQuestionId = 0;

const GAME_DURATION = 30_000;
const RESULTS_DURATION = 5_000;
const MIN_PLAYER_COUNT = 3;
const NO_ROUNDS = 10;

export function createUser(name: string) {
	const user: User = {
		id: `${++lastUserId}`,
		name,
	};
	users.set(user.id, user);
	return user;
}

export function createGroup(userId: string) {
	const user = users.get(userId);
	if (!user) return;
	const group: Group = {
		id: `${++lastGroupId}`,
		users: [user],
		readyUsers: new Set(),
		state: GState.WAITING_FOR_PLAYERS,
	};
	groups.set(group.id, group);
	user.groupId = group.id;
	return group;
}

export function joinGroup(userId: string, groupId: string | null) {
	const user = users.get(userId);
	if (!user) return;
	if (user.groupId) {
		const oldGroup = groups.get(user.groupId);
		oldGroup?.users.splice(
			oldGroup.users.findIndex(u => u.id === user.id),
			1,
		);
	}
	const group = groups.get(groupId!);
	if (group) {
		user.groupId = group.id;
		group.users.push(user);
		pubSub.publish(Event.GROUP_UPDATED, group);
		return group;
	}
}

export function leaveGroup(userId: string) {
	const user = users.get(userId);
	if (!user) return;
	if (user.groupId) {
		const group = groups.get(user.groupId);
		if (!group) return;
		group.users.splice(
			group.users.findIndex(u => u.id === user.id),
			1,
		);
		if (group.users.length === 0) {
			groups.delete(user.groupId);
		} else {
			if (group.users.length < MIN_PLAYER_COUNT) {
				group.state = GState.WAITING_FOR_PLAYERS;
			}
			pubSub.publish(Event.GROUP_UPDATED, group);
		}
		user.groupId = undefined;
	}
}

export function markUserReady(userId: string, ready: boolean) {
	const user = users.get(userId);
	if (!user) return;
	if (user.groupId) {
		const group = groups.get(user.groupId);
		if (!group) return;
		user.ready = ready;
		if (ready) {
			group.readyUsers.add(userId);
			if (group.readyUsers.size === group.users.length) {
				createQuestion(group);
			}
		} else {
			group.readyUsers.delete(userId);
		}
		pubSub.publish(Event.GROUP_UPDATED, group);
	}
}

function resetReadyState(group: Group) {
	for (const user of group.users) {
		user.ready = null;
	}
	group.readyUsers.clear();
}

function createQuestion(group: Group) {
	if (group.users.length < MIN_PLAYER_COUNT) return;
	const end = new Date(Date.now() + GAME_DURATION).toUTCString();
	const resolver = new PromiseResolver<void>();
	let answers = [] as { text: string }[];
	const answersSize = randomIntBetween(2, group.users.length - 1);
	for (let i = 0; i < answersSize; i++) {
		answers.push({ text: getRandomEmoji() });
	}
	group.question = {
		id: `${++lastQuestionId}`,
		groupId: group.id,
		round: nextRound(group.question?.round),
		type: Math.random() < 0.5 ? QType.AGREE : QType.DISAGREE,
		answers,
		submittedAnswers: new Map(),
		end,
		resolver: () => resolver.resolve(),
	};
	group.state = GState.IN_PROGRESS;
	resetReadyState(group);
	pubSub.publish(Event.GROUP_UPDATED, group);
	Promise.race([sleep(GAME_DURATION), resolver.promise]).then(() => computeResults(group));
}

export function submitAnswer(userId: string, answerIndex: number) {
	console.log("submitAnswer userId", userId, "answer", answerIndex);
	const user = users.get(userId);
	if (!user) {
		console.log("user with id", userId, "not found");
		return;
	}
	const group = groups.get(user.groupId!);
	if (!group?.question || answerIndex >= group.question.answers.length || answerIndex < 0) {
		console.log("submitAnswer: invalid group state");
		return;
	}
	group.question.submittedAnswers.set(userId, answerIndex);
	console.log(group.question.submittedAnswers.size, "answers");
	if (group.question.submittedAnswers.size === group.users.length) {
		console.log("all answers received, resolving");
		group.question.resolver();
	}
}

export function computeResults(group: Group) {
	console.log("computeResults", group.id);
	if (!group.question) return;
	const m: Map<number, User[]> = new Map();
	for (const [userId, answerIndex] of group.question.submittedAnswers) {
		const user = users.get(userId);
		if (!user) continue;
		if (m.has(answerIndex)) {
			m.get(answerIndex)!.push(user);
		} else {
			m.set(answerIndex, [user]);
		}
	}
	for (const user of group.users) {
		if (user.score == null) user.score = 0;
	}
	for (const [answerIndex, userList] of m) {
		for (const user of userList) {
			const scoreDelta =
				group.question.type === QType.AGREE
					? userList.length - 1
					: group.users.length - userList.length;
			user.score! += scoreDelta;
			group.question.answers[answerIndex].scoreDelta = scoreDelta;
			group.question.answers[answerIndex].users = group.question.answers[answerIndex].users ?? [];
			group.question.answers[answerIndex].users!.push(user);
		}
	}
	if (group.question.round === NO_ROUNDS) {
		group.state = GState.FINAL_RESULTS;
	} else {
		group.state = GState.SHOWING_RESULTS;
		sleep(RESULTS_DURATION).then(() => createQuestion(group));
	}
	pubSub.publish(Event.GROUP_UPDATED, group);
}

export function getGroup(id: string) {
	return groups.get(id);
}

export function getUser(id: string) {
	return users.get(id);
}

export function removeUser(id: string) {
	users.delete(id);
}

export function getAsyncIteratorFor<E extends Event>(event: E) {
	return pubSub.asyncIterator(event) as AsyncIterator<EventResult<E>>;
}

function nextRound(previousRound: number | undefined) {
	if (previousRound != null && previousRound >= NO_ROUNDS) {
		return 0;
	}
	return (previousRound || 0) + 1;
}
