export type DemoScenario = {
  mode: string;
  title: string;
  before_quotes: Array<{ symbol: string; price_change: string; volume: string }>;
  after_quotes: Array<{ symbol: string; price_change: string; volume: string }>;
  correlation: { pair: string; before: number; after: number };
  signals: Array<{ kind: string; title: string; detail: string; tone: string }>;
  historical_pattern: { event_date: string; similarity: number; future_1d: number; future_3d: number; future_5d: number };
  historical_outcomes: Record<string, number>;
  sample_size: number;
};

export const fallbackDemoScenario: DemoScenario = {
  mode: "DEMO MODE",
  title: "Your watchlist changed shape.",
  before_quotes: [
    { symbol: "RELIANCE", price_change: "+0.4%", volume: "Normal volume" },
    { symbol: "ONGC", price_change: "+0.2%", volume: "Normal volume" },
  ],
  after_quotes: [
    { symbol: "RELIANCE", price_change: "+5.8%", volume: "2.4x normal volume" },
    { symbol: "ONGC", price_change: "+4.9%", volume: "1.9x normal volume" },
  ],
  correlation: { pair: "RELIANCE vs ONGC", before: 0.31, after: 0.78 },
  signals: [
    { kind: "price", title: "Price anomaly", detail: "RELIANCE moved +5.8%, well above its recent baseline.", tone: "red" },
    { kind: "volume", title: "Volume anomaly", detail: "Trading volume reached 2.4x the recent normal level.", tone: "amber" },
    { kind: "relationship", title: "Relationship anomaly", detail: "RELIANCE and ONGC moved more closely together than their baseline.", tone: "amber" },
  ],
  historical_pattern: { event_date: "2024-07-18", similarity: 0.94, future_1d: 0.017, future_3d: 0.034, future_5d: -0.008 },
  historical_outcomes: { "1D median": 0.018, "3D median": 0.032, "5D median": 0.011, "Positive 3D frequency": 0.61 },
  sample_size: 18,
};
