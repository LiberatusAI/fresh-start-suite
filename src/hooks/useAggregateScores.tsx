import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AggregateScore {
  assetSlug: string;
  aggregateScore: number;
  normalizedScore: number;
  scoreChange: number;
  previousScore?: number;
  analysisDate: Date;
}

export const useAggregateScores = (assetSlugs: string[]) => {
  const [aggregateScores, setAggregateScores] = useState<Map<string, AggregateScore>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAggregateScores = async () => {
    if (assetSlugs.length === 0) {
      setAggregateScores(new Map());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch the most recent aggregate score for each asset
      const scoresMap = new Map<string, AggregateScore>();

      for (const assetSlug of assetSlugs) {
        // Get the most recent score for this asset
        const { data: recentScore, error: recentError } = await supabase
          .from('asset_aggregate_scores')
          .select('*')
          .eq('asset_slug', assetSlug)
          .order('analysis_date', { ascending: false })
          .limit(1);

        if (recentError) {
          console.error(`Error fetching score for ${assetSlug}:`, recentError);
          continue;
        }

        if (recentScore && recentScore.length > 0) {
          const score = recentScore[0];
          scoresMap.set(assetSlug, {
            assetSlug: score.asset_slug,
            aggregateScore: score.aggregate_score,
            normalizedScore: score.normalized_score,
            scoreChange: score.score_change,
            previousScore: score.previous_score,
            analysisDate: new Date(score.analysis_date)
          });
        }
      }

      setAggregateScores(scoresMap);
    } catch (err) {
      console.error('Error fetching aggregate scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch aggregate scores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAggregateScores();
  }, [assetSlugs.join(',')]); // Re-run when asset slugs change

  const getScoreForAsset = (assetSlug: string): AggregateScore | null => {
    return aggregateScores.get(assetSlug) || null;
  };

  return {
    aggregateScores,
    isLoading,
    error,
    getScoreForAsset,
    refetch: fetchAggregateScores
  };
}; 