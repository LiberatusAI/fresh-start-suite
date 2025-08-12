import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  slug: string;
}

export function useAssetDetails(idOrSlug: string | undefined) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAsset() {
      if (!idOrSlug) {
        setError(new Error('Asset ID or slug is required'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Try to find by ID first
        let { data, error: supabaseError } = await supabase
          .from('asset_subscriptions')
          .select('id, name:asset_name, symbol:asset_symbol, slug:asset_slug')
          .eq('id', idOrSlug)
          .single();

        // If not found by ID, try by slug
        if (!data && !supabaseError) {
          const { data: slugData, error: slugError } = await supabase
            .from('asset_subscriptions')
            .select('id, name:asset_name, symbol:asset_symbol, slug:asset_slug')
            .eq('asset_slug', idOrSlug)
            .single();
          
          data = slugData;
          supabaseError = slugError;
        }

        if (supabaseError) throw supabaseError;
        if (!data) throw new Error('Asset not found');

        setAsset(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch asset details'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchAsset();
  }, [idOrSlug]);

  return { asset, isLoading, error };
} 