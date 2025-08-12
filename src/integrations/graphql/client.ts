import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: '/.netlify/functions/santiment-proxy',
  fetchOptions: {
    mode: 'cors',
  },
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors && Array.isArray(graphQLErrors)) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );
  } else if (graphQLErrors) {
    console.error('[GraphQL error]:', graphQLErrors);
  }

  if (networkError) {
    console.error(`[Network error]:`, networkError);
  }
});

// Create cache with type policies
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        getMetric: {
          // Merge function for getMetric queries
          merge(existing, incoming, { args, readField }) {
            // If no existing data, return incoming
            if (!existing) return incoming;
            
            // If no args (shouldn't happen), return incoming
            if (!args) return incoming;
            
            // Get the slug from args
            const { selector } = args;
            const slug = selector?.slug;
            
            // If no slug, return incoming
            if (!slug) return incoming;
            
            // Merge timeseriesData arrays
            if (existing.timeseriesData && incoming.timeseriesData) {
              const existingData = new Map(
                existing.timeseriesData.map((item: any) => [item.datetime, item])
              );
              
              incoming.timeseriesData.forEach((item: any) => {
                existingData.set(item.datetime, item);
              });
              
              return {
                ...incoming,
                timeseriesData: Array.from(existingData.values())
              };
            }
            
            return incoming;
          },
          
          // Read function for getMetric queries
          read(existing) {
            return existing;
          }
        }
      }
    }
  }
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
}); 