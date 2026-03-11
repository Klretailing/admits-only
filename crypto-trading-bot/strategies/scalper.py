"""Scalping strategy: exploits short-term price inefficiencies and spread dynamics.

Looks for:
- Tight spreads with micro-momentum
- RSI extremes on 1-min timeframe for quick reversals
- Volume spikes indicating short-term moves
"""

import numpy as np
from data.market_data import MarketDataFetcher, MarketSnapshot
from strategies.base import BaseStrategy, Signal
from utils.logger import setup_logger

logger = setup_logger("scalper")


class ScalpingStrategy(BaseStrategy):
    name = "scalper"

    def __init__(self):
        self.min_spread_pct = 0.01  # ignore if spread too tight (no room)
        self.max_spread_pct = 0.15  # ignore if spread too wide (risky)
        self.rsi_oversold = 30
        self.rsi_overbought = 70
        self.volume_spike_multiplier = 1.5

    def evaluate(self, snapshot: MarketSnapshot, data: MarketDataFetcher) -> Signal | None:
        pid = snapshot.product_id
        price = snapshot.price

        if price <= 0:
            return None

        rsi = data.compute_rsi(pid, period=14)
        ema_fast = data.compute_ema(pid, period=5)
        ema_slow = data.compute_ema(pid, period=20)

        # Fetch candle data for volume analysis
        df = data.fetch_candles(pid, "ONE_MINUTE", 30)
        if df.empty or len(df) < 10:
            return None

        avg_volume = float(df["volume"].iloc[-20:].mean()) if len(df) >= 20 else float(df["volume"].mean())
        current_volume = float(df["volume"].iloc[-1])
        volume_spike = current_volume > avg_volume * self.volume_spike_multiplier if avg_volume > 0 else False

        # Spread check
        spread_ok = self.min_spread_pct <= snapshot.spread_pct <= self.max_spread_pct

        confidence = 0.0
        reasons = []

        # Signal 1: RSI oversold + EMA crossover forming + volume spike
        if rsi < self.rsi_oversold:
            confidence += 0.35
            reasons.append(f"RSI oversold ({rsi:.1f})")

        # Signal 2: Fast EMA crossing above slow EMA (bullish micro-momentum)
        if ema_fast > ema_slow and ema_fast > 0:
            ema_diff_pct = (ema_fast - ema_slow) / ema_slow * 100
            if 0 < ema_diff_pct < 0.3:  # very recent crossover
                confidence += 0.25
                reasons.append(f"EMA bullish cross ({ema_diff_pct:.3f}%)")

        # Signal 3: Volume spike suggests momentum
        if volume_spike:
            confidence += 0.2
            reasons.append(f"Volume spike ({current_volume:.0f} vs avg {avg_volume:.0f})")

        # Signal 4: Price near lower Bollinger Band
        upper, middle, lower = data.compute_bollinger(pid, period=20, std_dev=2.0)
        if lower > 0 and price <= lower * 1.005:
            confidence += 0.2
            reasons.append("Near lower Bollinger Band")

        if confidence < 0.5 or not spread_ok:
            return None

        # Compute stop/take-profit for scalp (tight)
        atr = self._estimate_atr(df)
        stop_loss = price - (1.0 * atr) if atr > 0 else price * 0.995
        take_profit = price + (1.5 * atr) if atr > 0 else price * 1.003

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
        tr = np.maximum(highs - lows, np.maximum(np.abs(highs - np.roll(closes, 1)), np.abs(lows - np.roll(closes, 1))))
        return float(np.mean(tr[1:]))  # skip first (rolled) value
