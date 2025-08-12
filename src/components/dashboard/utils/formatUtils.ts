
export const formatDate = (date: Date | null) => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export const formatPrice = (price: number | undefined) => {
  if (price === undefined) return 'N/A';
  if (price < 1) return `$${price.toFixed(2)}`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

export const formatLargeNumber = (value: number | undefined) => {
  if (value === undefined) return 'N/A';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatPrice(value);
};
