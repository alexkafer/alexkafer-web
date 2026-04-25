export const EXPERIMENT_ID = "lab_cta_v1";

export const STATS_QUERY = `
SELECT
  variant,
  COUNT(*) FILTER (WHERE event = 'impression') AS impressions,
  COUNT(*) FILTER (WHERE event = 'conversion') AS conversions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event = 'conversion')
    / NULLIF(COUNT(*) FILTER (WHERE event = 'impression'), 0),
    2
  ) AS conversion_rate_pct
FROM ab_events
WHERE experiment = '${EXPERIMENT_ID}'
GROUP BY variant
ORDER BY variant;`.trim();

export type StatsRow = {
  variant: "A" | "B";
  impressions: number;
  conversions: number;
  conversion_rate_pct: number | null;
};
