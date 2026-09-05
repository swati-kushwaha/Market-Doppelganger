export type WatchlistStock = {
  id: string;
  watchlist_id: string;
  symbol: string;
  exchange: string;
  added_at: string;
};

export type Watchlist = {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  watchlist_stocks: WatchlistStock[];
};
