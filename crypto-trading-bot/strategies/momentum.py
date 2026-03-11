"""Momentum strategy: rides strong directional moves using quant analysis.

Institutional momentum trading — enter trends early, ride them with
trailing stops, and exit before exhaustion. Uses the Hurst exponent
to confirm the market is actually trending (H > 0.5), then layers
multiple confirmation signals:

Entry criteria (need 3+ confluent signals):
- Hurst exponent > 0.55 (confirmed trending regime)
- EMA bullish stack (9 > 21 > 50)
- ADX > 25 (strong trend)
- MACD bullish crossover with rising histogram
- Price above VWAP (institutional buying)
- Ichimoku price above cloud
- Rising OBV (volume confirming the trend)
- RSI in momentum zone (55-75, not exhausted)
- Positive return skewness (right-tail potential)

Exit: Wider stops (2x ATR), bigger targets (3x ATR), trail with Keltner
"""

from data.market_data import MarketDataFetcher, MarketSnapshot
from quant.engine import QuantEngine
from strategies.base import BaseStrategy, Signal
from utils.logger import setup_logger

logger = setup_logger("momentum")


class MomentumStrategy(BaseStrategy):
    name = "momentum"

    def evaluate(self, snapshot: MarketSnapshot, data: MarketDataFetcher,
                 quant: QuantEngine | None = None) -> Signal | None:
        pid = snapshot.product_id
        price = snapshot.price

        if price <= 0:
            return None

        # Use 5-min candles for momentum (less noise than 1-min)
        df = data.fetch_candles(pid, "FIVE_MINUTE", 80)
        if df.empty or len(df) < 30:
            return None

        if quant is None:
            return None

        bid_depth = snapshot.bid_depth if hasattr(snapshot, "bid_depth") else 0
        ask_depth = snapshot.ask_depth if hasattr(snapshot, "ask_depth") else 0
        a = quant.analyze(f"{pid}_momentum", df, bid_depth=bid_depth, ask_depth=ask_depth)

        confidence = 0.0
        reasons = []

        # ── Regime check — momentum ONLY works in trending markets ──
        if a.regime != "trending":
            return None  # hard gate: don't momentum trade in non-trending regimes

        if a.hurst > 0.6:
            confidence += 0.15
            reasons.append(f"Strong trend (Hurst={a.hurst:.2f})")
        elif a.hurst > 0.55:
            confidence += 0.08
            reasons.append(f"Trending (Hurst={a.hurst:.2f})")

        # ── ADX trend strength ──
        if a.trend_strength > 35:
            confidence += 0.15
            reasons.append(f"ADX strong trend ({a.trend_strength:.1f})")
        elif a.trend_strength > 25:
            confidence += 0.10
            reasons.append(f"ADX trending ({a.trend_strength:.1f})")
        else:
            return None  # ADX too weak

        # ── EMA bullish stack ──
        if a.ema_stack == "bullish":
            confidence += 0.15
            reasons.append("EMA bullish stack (9>21>50)")

        # ── MACD ──
        if a.macd_signal == 1:
            confidence += 0.12
            reasons.append("MACD bullish crossover")
        if a.macd_histogram > 0:
            confidence += 0.05
            reasons.append("MACD histogram positive")

        # ── VWAP ──
        if a.price_vs_vwap > 0 and a.price_vs_vwap < 1.5:
            confidence += 0.10
            reasons.append(f"Above VWAP (+{a.price_vs_vwap:.2f}%)")

        # ── Ichimoku above cloud ──
        if a.ichimoku_signal == 1:
            confidence += 0.10
            reasons.append("Price above Ichimoku cloud")

        # ── RSI momentum zone (not overbought, not dead) ──
        if 55 <= a.rsi <= 75:
            confidence += 0.10
            reasons.append(f"RSI momentum zone ({a.rsi:.1f})")

        # ── Volume confirmation ──
        if a.obv_trend == 1:
            confidence += 0.10
            reasons.append("OBV rising (volume confirms trend)")

        if a.order_flow_imbalance > 0.2:
            confidence += 0.08
            reasons.append(f"Buy-side OFI ({a.order_flow_imbalance:.2f})")

        # ── MFI not overbought yet ──
        if 40 < a.mfi < 70:
            confidence += 0.05
            reasons.append(f"MFI healthy ({a.mfi:.1f})")

        # ── Statistical edge ──
        if a.skewness > 0.2:
            confidence += 0.05
            reasons.append(f"Positive skew ({a.skewness:.2f})")

        # ── 24h trend confirmation ──
        if 2.0 <= snapshot.price_change_24h_pct <= 8.0:
            confidence += 0.08
            reasons.append(f"24h trend +{snapshot.price_change_24h_pct:.1f}%")

        # ── Composite quant score ──
        if a.buy_score > 0.5:
            confidence += 0.10 * a.buy_score
            reasons.append(f"Quant buy={a.buy_score:.2f}")

        if confidence < 0.50:
            return None

        # Wider stops for momentum (let the trend breathe)
        stop_loss = price - (2.0 * a.atr_value) if a.atr_value > 0 else price * 0.985
        take_profit = price + (3.0 * a.atr_value) if a.atr_value > 0 else price * 1.01

        # Use Fibonacci extension for ambitious targets
        if a.fibonacci_levels and "0.618" in a.fibonacci_levels:
            fib_target = a.fibonacci_levels["0.0"]  # swing high
            if fib_target > take_profit:
                take_profit = fib_target
                reasons.append(f"Fib target ${fib_target:.2f}")

        logger.info(f"MOMENTUM SIGNAL {pid} conf={confidence:.3f} | {' | '.join(reasons)}")

        return Signal(
            product_id=pid,
            action="buy",
            confidence=min(confidence, 1.0),
            reason=" | ".join(reasons),
            strategy=self.name,
            suggested_stop_loss=stop_loss,
            suggested_take_profit=take_profit,
        )
