"""Mean reversion strategy: buys dips that are likely to bounce back.

Looks for:
- Price significantly below Bollinger lower band
- RSI deeply oversold
- Price far below VWAP (overextended sell-off)
- Decreasing sell volume (sellers exhausting)
"""

import numpy as np
from data.market_data import MarketDataFetcher, MarketSnapshot
from strategies.base import BaseStrategy, Signal
from utils.logger import setup_logger

logger = setup_logger("mean_reversion")


class MeanReversionStrategy(BaseStrategy):
    name = "mean_reversion"

    def evaluate(self, snapshot: MarketSnapshot, data: MarketDataFetcher) -> Signal | None:
        pid = snapshot.product_id
        price = snapshot.price

        if price <= 0:
            return None

        rsi = data.compute_rsi(pid, period=14)
        upper, middle, lower = data.compute_bollinger(pid, period=20, std_dev=2.0)
        vwap = data.compute_vwap(pid)

        df = data.fetch_candles(pid, "FIVE_MINUTE", 30)
        if df.empty or len(df) < 10:
            return None

        confidence = 0.0
        reasons = []

        # Signal 1: Price below lower Bollinger Band
        if lower > 0 and price < lower:
            pct_below = (lower - price) / lower * 100
            confidence += min(0.35, 0.15 + pct_below * 0.1)
            reasons.append(f"Below lower BB by {pct_below:.2f}%")

        # Signal 2: RSI deeply oversold
        if rsi < 25:
            confidence += 0.3
            reasons.append(f"RSI deeply oversold ({rsi:.1f})")
        elif rsi < 35:
            confidence += 0.15
            reasons.append(f"RSI oversold ({rsi:.1f})")

        # Signal 3: Price far below VWAP
        if vwap > 0 and price < vwap:
            pct_below_vwap = (vwap - price) / vwap * 100
            if pct_below_vwap > 0.5:
                confidence += 0.2
                reasons.append(f"Below VWAP by {pct_below_vwap:.2f}%")

        # Signal 4: Sell volume decreasing (exhaustion)
        if len(df) >= 6:
            recent_closes = df["close"].iloc[-6:].values
            recent_vols = df["volume"].iloc[-6:].values
            down_candles = [
                (recent_vols[i], i)
                for i in range(1, len(recent_closes))
                if recent_closes[i] < recent_closes[i - 1]
            ]
            if len(down_candles) >= 2:
                vols = [v for v, _ in down_candles]
                if vols[-1] < vols[0]:
                    confidence += 0.15
                    reasons.append("Sell volume exhaustion")

        if confidence < 0.5:
            return None

        # Mean reversion targets: bounce back toward the middle band
        atr = self._estimate_atr(df)
        stop_loss = price - (1.5 * atr) if atr > 0 else price * 0.99
        take_profit = middle if middle > price else price * 1.005

        return Signal(
            product_id=pid,
            action="buy",
            confidence=min(confidence, 1.0),
            reason=" | ".join(reasons),
            strategy=self.name,
            suggested_stop_loss=stop_loss,
            suggested_take_profit=take_profit,
        )

    def _estimate_atr(self, df, period: int = 14) -> float:
        if len(df) < period:
            return 0.0
        highs = df["high"].iloc[-period:].values
        lows = df["low"].iloc[-period:].values
        closes = df["close"].iloc[-period:].values
        tr = np.maximum(
            highs - lows,
            np.maximum(np.abs(highs - np.roll(closes, 1)), np.abs(lows - np.roll(closes, 1))),
        )
        return float(np.mean(tr[1:]))
