import { ApolloServer } from "@apollo/server";
import { strict as assert } from "node:assert";
import { ApolloContext, schema } from "./schema";
import { gql } from "graphql-request";
import { NexusGenObjects } from "./nexus-typegen";
import { getUser, getGroup } from "../impl";
import "../testing/toBeNullish";

describe("Mutations", () => {
	let testServer: ApolloServer<ApolloContext>;

	beforeEach(() => {
		testServer = new ApolloServer({
			schema,
			csrfPrevention: true,
			cache: "bounded",
		});
	});

	it("createUser creates a user", async () => {
		const { user, token } = await createUser("Peter");

		expect(user.name).toBe("Peter");
		expect(typeof user.id).toBe("string");
		expect(typeof token).toBe("string");
	});

	it("createGroup creates a group", async () => {
		const { user } = await createUser("Peter");
		const group = await createGroup(user.id);

		expect(group.users.length).toBe(1);
		expect(group.users[0].id).toBe(user.id);
		expect(typeof group.id).toBe("string");
	});

	it("joinGroup makes player join an existing group", async () => {
		const { user: peter } = await createUser("Peter");
		const { user: julie } = await createUser("Julie");
		const group = await createGroup(peter.id);
		const joinedGroup = await joinGroup(julie.id, group.id);

		expect(joinedGroup.users.length).toBe(2);
		expect(joinedGroup.users).toContainEqual(expect.objectContaining(peter));
		expect(joinedGroup.users).toContainEqual(expect.objectContaining(julie));
		expect(joinedGroup.id).toBe(group.id);
		joinedGroup.users.forEach(user => expect(user.groupId).toBe(joinedGroup.id));
	});

	it("leaveGroup removes a user from a group", async () => {
		const { user } = await createUser("Peter");
		const group = await createGroup(user.id);
		await leaveGroup(user.id);
		const updatedUser = getUser(user.id);
		const updatedGroup = getGroup(group.id);

		expect(updatedGroup).toBeNullish();
		expect(updatedUser?.groupId).toBeNullish();
	});

	it("markUserReady marks the user as ready", async () => {
		const { user } = await createUser("Peter");
		await createGroup(user.id);
		await markUserReady(user.id, true);
		const updatedUser = getUser(user.id);

		expect(updatedUser?.ready).toBe(true);
	});

	async function createUser(name: string) {
		const query = gql`
			mutation Mutation($name: String!) {
				createUser(name: $name) {
					token
					user {
						id
						name
					}
				}
			}
		`;
		const response = await testServer.executeOperation({
			query,
			variables: { name },
		});
		assert(response.body.kind === "single");
		return response.body.singleResult.data?.createUser as NexusGenObjects["AuthInfo"];
	}

	async function createGroup(userId: string) {
		const query = gql`
			mutation Mutation {
				createGroup {
					id
					users {
						id
						name
						groupId
					}
				}
			}
		`;
		const response = await testServer.executeOperation({ query }, { contextValue: { userId } });
		assert(response.body.kind === "single");
		return response.body.singleResult.data?.createGroup as NexusGenObjects["Group"];
	}

	async function joinGroup(userId: string, groupId: string) {
		const query = gql`
			mutation Mutation($groupId: ID!) {
				joinGroup(groupId: $groupId) {
					id
					users {
						id
						name
						groupId
					}
				}
			}
		`;
		const response = await testServer.executeOperation(
			{
				query,
				variables: { groupId },
			},
			{ contextValue: { userId } },
		);
		assert(response.body.kind === "single");
		return response.body.singleResult.data?.joinGroup as NexusGenObjects["Group"];
	}

	async function leaveGroup(userId: string) {
		const query = gql`
			mutation Mutation {
				leaveGroup
			}
		`;
		const response = await testServer.executeOperation({ query }, { contextValue: { userId } });
		assert(response.body.kind === "single");
		return response.body.singleResult.data?.joinGroup as NexusGenObjects["Group"];
	}

	async function markUserReady(userId: string, ready: boolean) {
		const query = gql`
			mutation Mutation($ready: Boolean!) {
				markUserReady(ready: $ready)
			}
		`;
		const response = await testServer.executeOperation(
			{
				query,
				variables: { ready },
			},
			{ contextValue: { userId } },
		);
		assert(response.body.kind === "single");
	}
});
