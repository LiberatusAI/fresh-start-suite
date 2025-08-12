import { gql } from '@apollo/client';

export const GET_AVAILABLE_ASSETS = gql`
  query GetAvailableAssets {
    allProjects {
      name
      slug
      ticker
      priceUsd: priceUsd
      percentChange24h: percentChange24h
    }
  }
`;

export const GET_ASSET_METRICS = gql`
  query GetAssetMetrics($slug: String!, $from: DateTime!, $to: DateTime!, $interval: String!) {
    marketcap: getMetric(metric: "marketcap_usd") {
      timeseriesData(
        selector: { slug: $slug }
        from: $from
        to: $to
        interval: $interval
      ) {
        datetime
        value
      }
    }
    price: getMetric(metric: "price_usd") {
      timeseriesData(
        selector: { slug: $slug }
        from: $from
        to: $to
        interval: $interval
      ) {
        datetime
        value
      }
    }
    volume: getMetric(metric: "volume_usd") {
      timeseriesData(
        selector: { slug: $slug }
        from: $from
        to: $to
        interval: $interval
      ) {
        datetime
        value
      }
    }
    socialVolume: getMetric(metric: "social_volume_total") {
      timeseriesData(
        selector: { slug: $slug }
        from: $from
        to: $to
        interval: $interval
      ) {
        datetime
        value
      }
    }
    exchangeInflow: getMetric(metric: "exchange_inflow") {
      timeseriesData(
        selector: { slug: $slug }
        from: $from
        to: $to
        interval: $interval
      ) {
        datetime
        value
      }
    }
    dormantCirculation: getMetric(metric: "dormant_circulation_365d") {
      timeseriesData(
        selector: { slug: $slug }
        from: $from
        to: $to
        interval: $interval
      ) {
        datetime
        value
      }
    }
    rsi: getMetric(metric: "price_rsi") {
      timeseriesData(
        selector: { slug: $slug }
        from: $from
        to: $to
        interval: $interval
      ) {
        datetime
        value
      }
    }
  }
`; 