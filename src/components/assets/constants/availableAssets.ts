import { CryptoAsset } from '@/types';

// Available crypto assets for selection
export const AVAILABLE_ASSETS: CryptoAsset[] = [
  { id: '1', slug: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿', currentPrice: 51283.47, priceChange24h: 2.5 },
  { id: '2', slug: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', currentPrice: 2434.19, priceChange24h: -1.2 },
  { id: '3', slug: 'ripple', name: 'Ripple', symbol: 'XRP', icon: 'Ꝓ', currentPrice: 0.48, priceChange24h: 0.6 },
  { id: '4', slug: 'cardano', name: 'Cardano', symbol: 'ADA', icon: '₳', currentPrice: 0.35, priceChange24h: -0.3 },
  { id: '5', slug: 'solana', name: 'Solana', symbol: 'SOL', icon: 'Ⓢ', currentPrice: 102.67, priceChange24h: 5.2 },
  { id: '6', slug: 'polkadot', name: 'Polkadot', symbol: 'DOT', icon: '●', currentPrice: 6.12, priceChange24h: 1.8 },
  { id: '7', slug: 'chainlink', name: 'Chainlink', symbol: 'LINK', icon: '⬡', currentPrice: 13.75, priceChange24h: 3.1 },
  { id: '8', slug: 'litecoin', name: 'Litecoin', symbol: 'LTC', icon: 'Ł', currentPrice: 65.87, priceChange24h: -0.7 },
];
