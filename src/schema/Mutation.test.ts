import { ApolloServer } from "apollo-server-express";
import { schema } from "./schema";
import { gql } from "graphql-request";
import { NexusGenObjects } from "./nexus-typegen";
import { getUser, getGroup } from "../impl";

describe("Mutations", () => {
	let testServer: ApolloServer;

	beforeEach(() => {
		testServer = new ApolloServer({
			schema,
			csrfPrevention: true,
			cache: "bounded",
		});
	});

	it("createUser creates a user", async () => {
		const user = await createUser("Peter");

		expect(user.name).toBe("Peter");
		expect(typeof user.id).toBe("string");
	});

	it("createGroup creates a group", async () => {
		const user = await createUser("Peter");
		const group = await createGroup(user.id);

		expect(group.users.length).toBe(1);
		expect(group.users[0].id).toBe(user.id);
		expect(typeof group.id).toBe("string");
	});

	it("joinGroup makes player join an existing group", async () => {
		const peter = await createUser("Peter");
		const julie = await createUser("Julie");
		const group = await createGroup(peter.id);
		const joinedGroup = await joinGroup(julie.id, group.id);

		expect(joinedGroup.users.length).toBe(2);
		expect(joinedGroup.users).toContainEqual(expect.objectContaining(peter));
		expect(joinedGroup.users).toContainEqual(expect.objectContaining(julie));
		expect(joinedGroup.id).toBe(group.id);
		joinedGroup.users.forEach(user => expect(user.groupId).toBe(joinedGroup.id));
	});

	it("leaveGroup removes a user from a group", async () => {
		const user = await createUser("Peter");
		const group = await createGroup(user.id);
		await leaveGroup(user.id);
		const updatedUser = getUser(user.id);
		const updatedGroup = getGroup(group.id);

		expect(updatedGroup).toBeUndefined();
		expect(updatedUser?.groupId).toBeUndefined();
	});

	async function createUser(name: string) {
		const query = gql`
			mutation Mutation($name: String!) {
				createUser(name: $name) {
					id
					name
				}
			}
		`;
		const { data } = await testServer.executeOperation({
			query,
			variables: { name },
		});
		return data?.createUser as NexusGenObjects["User"];
	}

	async function createGroup(userId: string) {
		const query = gql`
			mutation Mutation($userId: ID!) {
				createGroup(userId: $userId) {
					id
					users {
						id
						name
						groupId
					}
				}
			}
		`;
		const { data } = await testServer.executeOperation({
			query,
			variables: { userId },
		});
		return data?.createGroup as NexusGenObjects["Group"];
	}

	async function joinGroup(userId: string, groupId: string) {
		const query = gql`
			mutation Mutation($userId: ID!, $groupId: ID!) {
				joinGroup(userId: $userId, groupId: $groupId) {
					id
					users {
						id
						name
						groupId
					}
				}
			}
		`;
		const { data } = await testServer.executeOperation({
			query,
			variables: { userId, groupId },
		});
		return data?.joinGroup as NexusGenObjects["Group"];
	}

	async function leaveGroup(userId: string) {
		const query = gql`
			mutation Mutation($userId: ID!) {
				leaveGroup(userId: $userId)
			}
		`;
		const { data } = await testServer.executeOperation({
			query,
			variables: { userId },
		});
		return data?.joinGroup as NexusGenObjects["Group"];
	}
});
