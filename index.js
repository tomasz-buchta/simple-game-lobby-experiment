const { ApolloServer, gql, PubSub } = require('apollo-server');


// The GraphQL schema
const typeDefs = gql`
  type Subscription {
    positionChanged: Player  
  }

  type Query {
    players: [Player]
  }

  type Player {
    name: String
    position: String
  }

  type Mutation {
    changePosition(name: String, position: String): Player
  }
`;

const pubsub = new PubSub();

const POSITION_CHANGED = 'POSITION_CHANGED';

let LobbyController = class {
  constructor() {
    this.lobby = []
  }

  players() {
    return this.lobby
  }

  changePosition(player) {
    this.lobby = this.lobby.filter(p => p.name != player.name)
    this.lobby.push(player)
    return player
  }
}

const lobbyController = new LobbyController()

// A map of functions which return data for the schema.
const resolvers = {
  Subscription: {
    positionChanged: {      // Additional event labels can be passed to asyncIterator creation      
      subscribe: () => pubsub.asyncIterator([POSITION_CHANGED]),
    },
  },
  Query: {
    players(root, args, context) {
      return lobbyController.players();
    },
  },
  Mutation: {
    changePosition(root, args, context) {
      pubsub.publish(POSITION_CHANGED, { positionChanged: args });
      return lobbyController.changePosition(args);
    },
  },
};

const subscriptions = {
  onConnect: (connectionParams, webSocket) => {
    return { currentUser: { email: "joe@example.com", name: "Joe Doe"} }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  subscriptions,
  context: async ({ req, connection }) => {
    if (connection) {
      // check connection for metadata
      return connection.context;
    } else {
      // check from req
      const token = req.headers.authorization || "";

      return { token };
    }
  },
});

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`🚀 Server ready at ${url}`)
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`)
});
