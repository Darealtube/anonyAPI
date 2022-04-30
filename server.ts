import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { ApolloServer } from "apollo-server-express";
import dbConnect from "./utils/dbConnect";
import { schema } from "./graphql/schema";
import { useServer } from "graphql-ws/lib/use/ws";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";

const PORT = process.env.PORT || 3000;

dbConnect();
const app = express();
const httpServer = createServer(app);

// Create our WebSocket server using the HTTP server we just set up.
const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

// Save the returned server's info so we can shutdown this server later
// eslint-disable-next-line react-hooks/rules-of-hooks
const serverCleanup = useServer({ schema }, wsServer);

// Set up ApolloServer.
const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
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
  introspection: process.env.NODE_ENV !== 'production'
});

(async () => {
  await server.start();

  // Apply CORS here. app.use(cors()) does not work because 'app' is not the one listening to PORT; It's the HTTP Server.
  server.applyMiddleware({
    app,
    cors: {
      credentials: true,
      origin: [
        "http://localhost:4000",
        "https://anonylove.vercel.app",
        "https://studio.apollographql.com",
      ],
      methods: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
      allowedHeaders:
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    },
  });

  console.log(PORT)
})();

// Now that our HTTP server is fully set up, we can listen to it.
httpServer.listen(PORT, () => {
  console.log(`Server is now RUNNING on PORT ${PORT}`);
});

export default httpServer;
