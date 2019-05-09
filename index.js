const { ApolloServer, gql } = require("apollo-server");
const { GraphQLScalarType } = require("graphql");

const lifts = require("./data/lifts.json");
const trails = require("./data/trails.json");

const typeDefs = gql`
  scalar DateTime

  type Lift {
    id: ID
    name: String!
    status: LiftStatus!
    capacity: Int!
    night: Boolean!
    elevationGain: Int!
    trailAccess: [Trail!]!
  }

  type Trail {
    id: ID
    name: String!
    status: TrailStatus
    difficulty: String!
    groomed: Boolean!
    trees: Boolean!
    night: Boolean!
    accessedByLifts: [Lift!]!
  }

  enum LiftStatus {
    OPEN
    HOLD
    CLOSED
  }

  enum TrailStatus {
    OPEN
    CLOSED
  }

  type SetLiftStatusPayload {
    lift: Lift
    changed: DateTime
  }

  union SearchResult = Lift | Trail

  type Query {
    allLifts(status: LiftStatus): [Lift!]!
    findLiftById(id: ID!): Lift!
    liftCount(status: LiftStatus!): Int!
    allTrails(status: TrailStatus): [Trail!]!
    findTrailByName(name: String!): Trail!
    trailCount(status: TrailStatus!): Int!
    search(term: String, status: LiftStatus): [SearchResult!]!
  }

  type Mutation {
    setLiftStatus(id: ID!, status: LiftStatus!): SetLiftStatusPayload!
    setTrailStatus(id: ID!, status: TrailStatus!): Trail!
  }
`;
const resolvers = {
  Query: {
    allLifts: (parent, { status }) => {
      if (!status) {
        return lifts;
      } else {
        return lifts.filter(lift => lift.status === status);
      }
    },
    findLiftById: (parent, { id }) => {
      return lifts.find(lift => id === lift.id);
    },
    liftCount: (parent, { status }) => {
      let i = 0;
      lifts.map(lift => {
        lift.status === status ? i++ : null;
      });
      return i;
    },
    allTrails: (parent, { status }) => {
      if (!status) {
        return trails;
      } else {
        return trails.filter(trail => trail.status === status);
      }
    },
    findTrailByName: (parent, { name }) => {
      return trails.find(trail => name === trail.name);
    },
    trailCount: (parent, { status }) => {
      let i = 0;
      trails.map(trail => {
        trail.status === status ? i++ : null;
      });
      return i;
    },
    search: (parent, { term, status }) => {
      let liftsNTrails = [...lifts, ...trails];

      const byTerm = t => item =>
        t.toLowerCase() === item.id.substr(0, t.length).toLowerCase();

      const byStatus = status => item =>
        status.toLowerCase() === item.status.toLowerCase();

      if (term && status) {
        liftsNTrails = liftsNTrails.filter(byTerm(term));
        liftsNTrails = liftsNTrails.filter(byStatus(status));
      } else if (term) {
        liftsNTrails = liftsNTrails.filter(byTerm(term));
      } else if (status) {
        liftsNTrails = liftsNTrails.filter(byStatus(status));
      } else {
        liftsNTrails = [];
      }

      return liftsNTrails;
    }
  },
  Mutation: {
    setLiftStatus: (parent, { id, status }) => {
      let updatedLift = lifts.find(lift => id === lift.id);
      updatedLift.status = status;
      return {
        lift: updatedLift,
        changed: new Date()
      };
    },
    setTrailStatus: (parent, { id, status }) => {
      let updatedTrail = trails.find(trail => id === trail.id);
      updatedTrail.status = status;
      return updatedTrail;
    }
  },
  Lift: {
    trailAccess: parent =>
      parent.trails.map(id => trails.find(t => id === t.id)).filter(x => x)
  },
  Trail: {
    accessedByLifts: parent =>
      parent.lift.map(id => lifts.find(l => id === l.id))
  },
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    description: "A valid date time value.",
    parseValue: value => new Date(value),
    serialize: value => new Date(value).toISOString(),
    parseLiteral: ast => new Date(ast.value)
  }),
  SearchResult: {
    __resolveType: parent => (parent.elevationGain ? "Lift" : "Trail")
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
});

server.listen().then(({ url }) => {
  console.log(`Server running at ${url}`);
});
