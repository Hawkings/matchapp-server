import { ApolloServer } from "apollo-server-express";
import {
	ApolloServerPluginDrainHttpServer,
	ApolloServerPluginLandingPageLocalDefault,
} from "apollo-server-core";
import express from "express";
import { schema } from "./schema/schema";
import http from "http";
import { getUserIdFromToken } from "./auth";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { leaveGroup, removeUser } from "./impl";

const PORT = 7777;

(async () => {
	const app = express();
	const httpServer = http.createServer(app);
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: "/subscriptions",
	});
	const serverCleanup = useServer(
		{
			schema,
			context: async ctx => {
				if (ctx.connectionParams?.authToken) {
					return { userId: getUserIdFromToken(ctx.connectionParams.authToken as string) };
				} else {
					return { userId: undefined };
				}
			},
			onDisconnect(ctx) {
				if (ctx.connectionParams?.authToken) {
					const userId = getUserIdFromToken(ctx.connectionParams.authToken as string);
					if (userId) {
						leaveGroup(userId!);
						removeUser(userId!);
					}
				}
			},
		},
		wsServer,
	);
	const server = new ApolloServer({
		schema,
		csrfPrevention: true,
		cache: "bounded",
		plugins: [
			ApolloServerPluginDrainHttpServer({ httpServer }),
			ApolloServerPluginLandingPageLocalDefault({ embed: true }),
			{
				async serverWillStart() {
					return {
						async drainServer() {
							await serverCleanup.dispose();
						},
					};
				},
			},
		],
		context: async ({ req }) => {
			const token = req.headers.authorization || "";
			const userId = getUserIdFromToken(token);
			return { userId };
		},
	});
	await server.start();
	server.applyMiddleware({
		app,
		path: "/graphql",
	});
	await new Promise<void>(resolve => httpServer.listen({ port: PORT }, resolve));
	console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
})();
