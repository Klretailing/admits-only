"""Momentum strategy: rides strong directional moves.

Looks for:
- Strong EMA alignment (fast > medium > slow)
- VWAP confirmation
- RSI in momentum zone (55-75, not yet overbought)
- Increasing volume trend
"""

import numpy as np
from data.market_data import MarketDataFetcher, MarketSnapshot
from strategies.base import BaseStrategy, Signal
from utils.logger import setup_logger

logger = setup_logger("momentum")


class MomentumStrategy(BaseStrategy):
    name = "momentum"

    def evaluate(self, snapshot: MarketSnapshot, data: MarketDataFetcher) -> Signal | None:
        pid = snapshot.product_id
        price = snapshot.price

        if price <= 0:
            return None

        # Compute indicators
        ema_8 = data.compute_ema(pid, period=8)
        ema_21 = data.compute_ema(pid, period=21)
        ema_55 = data.compute_ema(pid, period=55)
        rsi = data.compute_rsi(pid, period=14)
        vwap = data.compute_vwap(pid)

        # Fetch candles for volume trend
        df = data.fetch_candles(pid, "FIVE_MINUTE", 30)
        if df.empty or len(df) < 10:
            return None

        confidence = 0.0
        reasons = []

        # Signal 1: EMA alignment (bullish stacking)
        if ema_8 > ema_21 > ema_55 > 0:
            confidence += 0.3
            reasons.append("EMA bullish stack (8>21>55)")

        # Signal 2: Price above VWAP
        if vwap > 0 and price > vwap:
            pct_above = (price - vwap) / vwap * 100
            if pct_above < 1.0:  # not too far extended
                confidence += 0.2
                reasons.append(f"Above VWAP (+{pct_above:.2f}%)")

        # Signal 3: RSI in momentum zone
        if 55 <= rsi <= 75:
            confidence += 0.2
            reasons.append(f"RSI momentum zone ({rsi:.1f})")

        # Signal 4: Volume increasing over last 5 candles
        if len(df) >= 5:
            recent_vols = df["volume"].iloc[-5:].values
            if all(recent_vols[i] <= recent_vols[i + 1] for i in range(len(recent_vols) - 1)):
                confidence += 0.15
                reasons.append("Volume trending up")
            elif np.mean(recent_vols[-3:]) > np.mean(recent_vols[:2]) * 1.2:
                confidence += 0.1
                reasons.append("Volume expanding")

        # Signal 5: Strong 24h performance (trend day)
        if 2.0 <= snapshot.price_change_24h_pct <= 8.0:
            confidence += 0.15
            reasons.append(f"24h trend +{snapshot.price_change_24h_pct:.1f}%")

        if confidence < 0.55:
            return None

        # Wider stops for momentum trades
        atr = self._estimate_atr(df)
        stop_loss = price - (2.0 * atr) if atr > 0 else price * 0.985
        take_profit = price + (3.0 * atr) if atr > 0 else price * 1.01

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
