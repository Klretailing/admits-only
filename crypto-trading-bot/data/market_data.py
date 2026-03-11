"""Fetches and caches real-time market data from Coinbase."""

import time
from dataclasses import dataclass, field
import numpy as np
import pandas as pd
from exchange.coinbase_client import CoinbaseClient
from utils.logger import setup_logger

logger = setup_logger("market_data")


@dataclass
class MarketSnapshot:
    product_id: str
    price: float
    bid: float
    ask: float
    spread_pct: float
    volume_24h: float
    price_change_24h_pct: float
    timestamp: float = field(default_factory=time.time)


class MarketDataFetcher:
    def __init__(self, client: CoinbaseClient, pairs: list[str]):
        self.client = client
        self.pairs = pairs
        self.price_history: dict[str, list[float]] = {p: [] for p in pairs}
        self.candle_cache: dict[str, pd.DataFrame] = {}
        self._max_history = 500

    def fetch_snapshots(self) -> dict[str, MarketSnapshot]:
        """Fetch current price data for all tracked pairs."""
        snapshots = {}

        bid_ask_data = {}
        try:
            resp = self.client.get_best_bid_ask(self.pairs)
            pricebooks = (
                resp.get("pricebooks", [])
                if isinstance(resp, dict)
                else getattr(resp, "pricebooks", [])
            )
            for book in pricebooks:
                pid = book.get("product_id") if isinstance(book, dict) else book.product_id
                bids = book.get("bids", []) if isinstance(book, dict) else book.bids
                asks = book.get("asks", []) if isinstance(book, dict) else book.asks
                if bids and asks:
                    best_bid = float(bids[0].get("price", 0) if isinstance(bids[0], dict) else bids[0].price)
                    best_ask = float(asks[0].get("price", 0) if isinstance(asks[0], dict) else asks[0].price)
                    bid_ask_data[pid] = (best_bid, best_ask)
        except Exception as e:
            logger.warning(f"Failed to fetch bid/ask: {e}")

        for pair in self.pairs:
            try:
                product = self.client.get_product(pair)
                price = float(
                    product.get("price", 0)
                    if isinstance(product, dict)
                    else getattr(product, "price", 0)
                )
                volume = float(
                    product.get("volume_24h", 0)
                    if isinstance(product, dict)
                    else getattr(product, "volume_24h", 0)
                )
                change = float(
                    product.get("price_percentage_change_24h", 0)
                    if isinstance(product, dict)
                    else getattr(product, "price_percentage_change_24h", 0)
                )

                bid, ask = bid_ask_data.get(pair, (price, price))
                spread_pct = ((ask - bid) / price * 100) if price > 0 else 0

                snap = MarketSnapshot(
                    product_id=pair,
                    price=price,
                    bid=bid,
                    ask=ask,
                    spread_pct=spread_pct,
                    volume_24h=volume,
                    price_change_24h_pct=change,
                )
                snapshots[pair] = snap

                # Track history
                self.price_history[pair].append(price)
                if len(self.price_history[pair]) > self._max_history:
                    self.price_history[pair] = self.price_history[pair][-self._max_history:]

            except Exception as e:
                logger.error(f"Error fetching {pair}: {e}")

        return snapshots

    def fetch_candles(self, product_id: str, granularity: str = "ONE_MINUTE", count: int = 100) -> pd.DataFrame:
        """Fetch recent candles and return as DataFrame."""
        now = int(time.time())
        granularity_seconds = {
            "ONE_MINUTE": 60,
            "FIVE_MINUTE": 300,
            "FIFTEEN_MINUTE": 900,
            "ONE_HOUR": 3600,
        }
        interval = granularity_seconds.get(granularity, 60)
        start = str(now - (count * interval))
        end = str(now)

        try:
            candles = self.client.get_candles(product_id, start, end, granularity)
            rows = []
            for c in candles:
                if isinstance(c, dict):
                    rows.append({
                        "time": int(c.get("start", 0)),
                        "open": float(c.get("open", 0)),
                        "high": float(c.get("high", 0)),
                        "low": float(c.get("low", 0)),
                        "close": float(c.get("close", 0)),
                        "volume": float(c.get("volume", 0)),
                    })
                else:
                    rows.append({
                        "time": int(getattr(c, "start", 0)),
                        "open": float(getattr(c, "open", 0)),
                        "high": float(getattr(c, "high", 0)),
                        "low": float(getattr(c, "low", 0)),
                        "close": float(getattr(c, "close", 0)),
                        "volume": float(getattr(c, "volume", 0)),
                    })
            df = pd.DataFrame(rows)
            if not df.empty:
                df.sort_values("time", inplace=True)
                df.reset_index(drop=True, inplace=True)
            self.candle_cache[product_id] = df
            return df
        except Exception as e:
            logger.error(f"Error fetching candles for {product_id}: {e}")
            return self.candle_cache.get(product_id, pd.DataFrame())

    def get_prices(self) -> dict[str, float]:
        """Quick lookup of latest prices from history."""
        return {
            pair: history[-1]
            for pair, history in self.price_history.items()
            if history
        }

    def compute_rsi(self, product_id: str, period: int = 14) -> float:
        """Compute RSI from price history."""
        prices = self.price_history.get(product_id, [])
        if len(prices) < period + 1:
            return 50.0  # neutral default

        deltas = np.diff(prices[-(period + 1):])
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gain = np.mean(gains)
        avg_loss = np.mean(losses)

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def compute_ema(self, product_id: str, period: int) -> float:
        """Compute EMA from price history."""
        prices = self.price_history.get(product_id, [])
        if len(prices) < period:
            return prices[-1] if prices else 0.0
        series = pd.Series(prices[-period * 3:])
        return float(series.ewm(span=period, adjust=False).mean().iloc[-1])

    def compute_bollinger(self, product_id: str, period: int = 20, std_dev: float = 2.0) -> tuple[float, float, float]:
        """Compute Bollinger Bands (upper, middle, lower)."""
        prices = self.price_history.get(product_id, [])
        if len(prices) < period:
            p = prices[-1] if prices else 0.0
            return p, p, p
        window = prices[-period:]
        middle = np.mean(window)
        std = np.std(window)
        return middle + std_dev * std, middle, middle - std_dev * std

    def compute_vwap(self, product_id: str) -> float:
        """Compute VWAP from cached candles."""
        df = self.candle_cache.get(product_id)
        if df is None or df.empty:
            return 0.0
        typical = (df["high"] + df["low"] + df["close"]) / 3
        return float((typical * df["volume"]).sum() / df["volume"].sum()) if df["volume"].sum() > 0 else 0.0
