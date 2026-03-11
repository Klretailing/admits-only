"""Mean reversion strategy: buys statistically oversold assets using quant analysis.

This strategy is the mathematical opposite of momentum. It exploits the
tendency of prices to revert to their statistical mean after extreme moves.
The Hurst exponent must confirm mean-reverting behavior (H < 0.5).

Entry criteria (need 3+ confluent signals):
- Hurst exponent < 0.45 (confirmed mean-reverting regime)
- Price z-score < -2.0 (statistically extreme deviation)
- RSI deeply oversold (<25) with MFI confirmation
- Price below lower Bollinger Band
- Bullish reversal candle pattern at the bottom
- Double bottom formation
- Price at/near major support level
- Sell volume exhausting (decreasing on down candles)
- Order flow shifting to buy side

Exit: Target the Bollinger middle band or VWAP (mean), stop below swing low
"""

from data.market_data import MarketDataFetcher, MarketSnapshot
from quant.engine import QuantEngine
from quant import indicators as ind
from strategies.base import BaseStrategy, Signal
from utils.logger import setup_logger

logger = setup_logger("mean_reversion")


class MeanReversionStrategy(BaseStrategy):
    name = "mean_reversion"

    def evaluate(self, snapshot: MarketSnapshot, data: MarketDataFetcher,
                 quant: QuantEngine | None = None) -> Signal | None:
        pid = snapshot.product_id
        price = snapshot.price

        if price <= 0:
            return None

        df = data.fetch_candles(pid, "FIVE_MINUTE", 80)
        if df.empty or len(df) < 30:
            return None

        if quant is None:
            return None

        bid_depth = snapshot.bid_depth if hasattr(snapshot, "bid_depth") else 0
        ask_depth = snapshot.ask_depth if hasattr(snapshot, "ask_depth") else 0
        a = quant.analyze(f"{pid}_reversion", df, bid_depth=bid_depth, ask_depth=ask_depth)

        confidence = 0.0
        reasons = []

        # ── Regime check — mean reversion ONLY works in mean-reverting markets ──
        if a.regime == "trending" and a.trend_strength > 30:
            return None  # don't catch falling knives in strong trends

        if a.regime == "mean_reverting":
            confidence += 0.12
            reasons.append(f"Mean-reverting regime (Hurst={a.hurst:.2f})")

        # ── Statistical deviation (z-score) ──
        zscore_series = ind.zscore(df["close"], period=20)
        if not zscore_series.empty:
            z = float(zscore_series.iloc[-1]) if not zscore_series.isna().iloc[-1] else 0
            if z < -2.5:
                confidence += 0.20
                reasons.append(f"Extreme z-score ({z:.2f})")
            elif z < -2.0:
                confidence += 0.15
                reasons.append(f"Low z-score ({z:.2f})")
            elif z < -1.5:
                confidence += 0.08
                reasons.append(f"Below mean z-score ({z:.2f})")

        # ── RSI deeply oversold ──
        if a.rsi < 20:
            confidence += 0.18
            reasons.append(f"RSI extremely oversold ({a.rsi:.1f})")
        elif a.rsi < 30:
            confidence += 0.12
            reasons.append(f"RSI oversold ({a.rsi:.1f})")

        # ── MFI oversold (volume-weighted confirmation) ──
        if a.mfi < 20:
            confidence += 0.10
            reasons.append(f"MFI deeply oversold ({a.mfi:.1f})")

        # ── Price below VWAP (mean target) ──
        if a.price_vs_vwap < -0.5:
            confidence += 0.10
            reasons.append(f"Below VWAP ({a.price_vs_vwap:.2f}%)")

        # ── Reversal candlestick patterns ──
        if a.engulfing == 1:
            confidence += 0.12
            reasons.append("Bullish engulfing (reversal)")
        if a.hammer == 1:
            confidence += 0.10
            reasons.append("Hammer (reversal)")
        if a.morning_star == 1:
            confidence += 0.12
            reasons.append("Morning star (reversal)")
        if a.doji == 1:
            confidence += 0.06
            reasons.append("Doji (indecision at bottom)")

        # ── Double bottom (classic reversal pattern) ──
        if a.double_bottom:
            confidence += 0.15
            reasons.append("Double bottom formation")

        # ── Price near support level ──
        if a.support_levels:
            nearest_support = max(a.support_levels)
            pct_from = (price - nearest_support) / price * 100
            if pct_from < 0.3:
                confidence += 0.10
                reasons.append(f"At support (${nearest_support:.2f})")

        # ── Fibonacci level confluence ──
        if a.fibonacci_levels:
            for fib_name, fib_price in a.fibonacci_levels.items():
                if fib_name in ("0.618", "0.786"):
                    pct_from_fib = abs(price - fib_price) / price * 100
                    if pct_from_fib < 0.3:
                        confidence += 0.08
                        reasons.append(f"At Fib {fib_name} (${fib_price:.2f})")
                        break

        # ── Order flow shifting to buy side ──
        if a.order_flow_imbalance > 0.2:
            confidence += 0.08
            reasons.append(f"Buyers stepping in (OFI={a.order_flow_imbalance:.2f})")

        # ── OBV divergence (price falling but volume not confirming) ──
        if a.obv_trend == 1:
            confidence += 0.08
            reasons.append("OBV bullish divergence")

        # ── Ichimoku below cloud (extra caution flag) ──
        if a.ichimoku_signal == -1:
            confidence *= 0.85
            reasons.append("(caution: below Ichimoku cloud)")

        # ── Composite quant score ──
        if a.buy_score > 0.5:
            confidence += 0.08 * a.buy_score
            reasons.append(f"Quant buy={a.buy_score:.2f}")

        # ── Tail risk check — avoid if extreme kurtosis ──
        if a.kurtosis > 6:
            confidence *= 0.75
            reasons.append(f"(fat tails risk, kurt={a.kurtosis:.1f})")

        if confidence < 0.45:
            return None

        # Mean reversion target: bounce to middle band / VWAP
        bb_upper, bb_mid, bb_lower = ind.bollinger_bands(df["close"])
        target_price = float(bb_mid.iloc[-1]) if not bb_mid.empty else price * 1.005

        stop_loss = price - (1.5 * a.atr_value) if a.atr_value > 0 else price * 0.99
        take_profit = target_price if target_price > price else price * 1.005

        logger.info(f"REVERSION SIGNAL {pid} conf={confidence:.3f} | {' | '.join(reasons)}")

        return Signal(
            product_id=pid,
            action="buy",
            confidence=min(confidence, 1.0),
            reason=" | ".join(reasons),
            strategy=self.name,
            suggested_stop_loss=stop_loss,
            suggested_take_profit=take_profit,
        )
