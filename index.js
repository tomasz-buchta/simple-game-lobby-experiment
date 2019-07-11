const { ApolloServer, gql, PubSub } = require('apollo-server');
const isEqual = require('lodash.isequal');


// The GraphQL schema
const typeDefs = gql`
  type Subscription {
    positionChanged: Lobby,
  }

  type Query {
    lobby: Lobby
  }

  type Lobby {
    players: [Player],
    readyToStart: Boolean
  }

  type Player {
    name: String
    position: String
  }

  type Mutation {
    changePosition(name: String, position: String): Lobby
  }
`;

const pubsub = new PubSub();

const POSITION_CHANGED = 'POSITION_CHANGED';

let LobbyController = class {
  constructor() {
    this.lobby = [
      // Sample data for easier testing
      { name: "Player TOP", position: "top" },
      { name: "Player BOTTOM", position: "bottom" },
      { name: "Player SUPPORT", position: "support" },
      { name: "Player JUNGLE", position: "jungle" },
      // { name: "Player MID", position: "mid" }
    ]
  }

  getLobby() {
    return this.wrapLobby()
  }

  changePosition(player) {
    this.lobby = this.lobby.filter(p => p.name != player.name)
    this.lobby.push(player)
    return this.wrapLobby()
  }

  wrapLobby() {
    return { players: this.lobby, readyToStart: this.readyToStart() }
  }

  readyToStart() {
    // Check if all positions are taken
    const positions = this.lobby.map(({position}) => position).sort()
    const expectedPositions = [ 'bottom', 'jungle', 'mid', 'support', 'top' ]
    return positions.length == 5 && isEqual(positions, expectedPositions)
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
    lobby(root, args, context) {
      return lobbyController.getLobby();
    },
  },
  Mutation: {
    changePosition(root, args, context) {
      const result = lobbyController.changePosition(args);
      pubsub.publish(POSITION_CHANGED, { positionChanged: result });
      return result
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
  subscriptions
});

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`🚀 Server ready at ${url}`)
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`)
});
