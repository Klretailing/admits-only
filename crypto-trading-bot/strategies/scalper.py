"""Scalping strategy: exploits short-term price inefficiencies using quant signals.

This is the highest-frequency strategy. It targets micro-moves that last
seconds to minutes. The quant engine provides institutional-grade analysis:

Entry criteria (need 3+ confluent signals):
- RSI/Stochastic oversold on 1-min with bullish divergence
- Price at/below lower Bollinger or Keltner channel
- Bullish candlestick pattern (hammer, engulfing, morning star)
- Volume spike with positive order flow imbalance
- MACD histogram turning positive (momentum shift)
- Volatility squeeze releasing (Bollinger inside Keltner)
- Price at support level or Point of Control

Exit: Tight stops (1x ATR), quick profit targets (1.5x ATR)
"""

from data.market_data import MarketDataFetcher, MarketSnapshot
from quant.engine import QuantEngine
from strategies.base import BaseStrategy, Signal
from utils.logger import setup_logger

logger = setup_logger("scalper")


class ScalpingStrategy(BaseStrategy):
    name = "scalper"

    def __init__(self):
        self.min_spread_pct = 0.01
        self.max_spread_pct = 0.15

    def evaluate(self, snapshot: MarketSnapshot, data: MarketDataFetcher,
                 quant: QuantEngine | None = None) -> Signal | None:
        pid = snapshot.product_id
        price = snapshot.price

        if price <= 0:
            return None

        # Spread gate
        if not (self.min_spread_pct <= snapshot.spread_pct <= self.max_spread_pct):
            return None

        # Get quant assessment from 1-min data
        df = data.fetch_candles(pid, "ONE_MINUTE", 100)
        if df.empty or len(df) < 30:
            return None

        if quant is None:
            return None

        bid_depth = snapshot.bid_depth if hasattr(snapshot, "bid_depth") else 0
        ask_depth = snapshot.ask_depth if hasattr(snapshot, "ask_depth") else 0
        a = quant.analyze(f"{pid}_scalp", df, bid_depth=bid_depth, ask_depth=ask_depth)

        confidence = 0.0
        reasons = []

        # ── Core scalp signals ──

        # 1. RSI oversold
        if a.rsi < 25:
            confidence += 0.20
            reasons.append(f"RSI deeply oversold ({a.rsi:.1f})")
        elif a.rsi < 35:
            confidence += 0.12
            reasons.append(f"RSI oversold ({a.rsi:.1f})")

        # 2. Stochastic crossover in oversold zone
        if a.stoch_k < 20 and a.stoch_k > a.stoch_d:
            confidence += 0.12
            reasons.append(f"Stoch bullish cross in oversold ({a.stoch_k:.0f})")

        # 3. MACD histogram turning positive
        if a.macd_signal == 1:
            confidence += 0.15
            reasons.append("MACD bullish crossover")
        elif a.macd_histogram > 0:
            confidence += 0.08
            reasons.append("MACD histogram positive")

        # 4. Volatility squeeze releasing
        if a.vol_regime == "contracting":
            confidence += 0.10
            reasons.append("Volatility squeeze (breakout imminent)")

        # 5. Bullish candlestick patterns
        if a.engulfing == 1:
            confidence += 0.12
            reasons.append("Bullish engulfing")
        if a.hammer == 1:
            confidence += 0.10
            reasons.append("Hammer pattern")
        if a.morning_star == 1:
            confidence += 0.10
            reasons.append("Morning star reversal")

        # 6. Order flow imbalance (buyers dominating)
        if a.order_flow_imbalance > 0.3:
            confidence += 0.12
            reasons.append(f"Buy-side OFI ({a.order_flow_imbalance:.2f})")

        # 7. OBV confirming
        if a.obv_trend == 1:
            confidence += 0.08
            reasons.append("OBV rising (volume confirms)")

        # 8. Price near support / Point of Control
        if a.support_levels:
            nearest_support = max(a.support_levels)
            pct_from_support = (price - nearest_support) / price * 100
            if pct_from_support < 0.3:
                confidence += 0.10
                reasons.append(f"Near support (${nearest_support:.2f})")

        if a.poc > 0:
            pct_from_poc = abs(price - a.poc) / price * 100
            if pct_from_poc < 0.2:
                confidence += 0.08
                reasons.append(f"At POC (${a.poc:.2f})")

        # 9. MFI oversold
        if a.mfi < 25:
            confidence += 0.08
            reasons.append(f"MFI oversold ({a.mfi:.1f})")

        # ── Regime penalty — scalping works best in mean-reverting markets ──
        if a.regime == "trending" and a.trend_strength > 30:
            confidence *= 0.7
            reasons.append("(penalized: strong trend)")

        # ── Composite quant score boost ──
        if a.buy_score > 0.5:
            confidence += 0.10 * a.buy_score
            reasons.append(f"Quant buy={a.buy_score:.2f}")

        if confidence < 0.45:
            return None

        # Tight scalp stops
        stop_loss = price - (1.0 * a.atr_value) if a.atr_value > 0 else price * 0.995
        take_profit = price + (1.5 * a.atr_value) if a.atr_value > 0 else price * 1.003

        logger.info(f"SCALP SIGNAL {pid} conf={confidence:.3f} | {' | '.join(reasons)}")

        return Signal(
            product_id=pid,
            action="buy",
            confidence=min(confidence, 1.0),
            reason=" | ".join(reasons),
            strategy=self.name,
            suggested_stop_loss=stop_loss,
            suggested_take_profit=take_profit,
        )
