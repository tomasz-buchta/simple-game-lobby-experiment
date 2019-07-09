const { ApolloServer, gql, PubSub } = require('apollo-server');


// The GraphQL schema
const typeDefs = gql`
  type Subscription {
    postAdded: Post  
  }

  type Query {
    posts: [Post]
  }

  type Mutation {
    addPost(author: String, comment: String): Post
  }

  type Post {
    author: String
    comment: String
  }
`;

const pubsub = new PubSub();

const POST_ADDED = 'POST_ADDED';

let PostController = class {
  constructor(posts = []) {
    this.posts = posts
  }

  posts() {
    return this.posts
  }

  addPost(args) {
    const post = { ...args }
    this.posts.push(post)
    return post
  }
}

const postController = new PostController()

// A map of functions which return data for the schema.
const resolvers = {
  Subscription: {
    postAdded: {      // Additional event labels can be passed to asyncIterator creation      
      subscribe: () => pubsub.asyncIterator([POST_ADDED]),
    },
  },
  Query: {
    posts(root, args, context) {
      return postController.posts;
    },
  },
  Mutation: {
    addPost(root, args, context) {
      pubsub.publish(POST_ADDED, { postAdded: args });
      return postController.addPost(args);
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
