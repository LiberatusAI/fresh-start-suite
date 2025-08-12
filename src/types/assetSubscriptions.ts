export interface AssetSubscription {
  id: string;
  assetId: string;
  slug: string;
  name: string;
  symbol: string;
  icon: string;
  reportTimes: string[];
  reportDays: string;
  lastReportSent: Date | null;
  currentPrice?: number;
  priceChange24h?: number;
  tradingVolume24h?: number;
  marketCap?: number;
}
