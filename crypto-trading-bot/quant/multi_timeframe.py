"""Multi-Timeframe Confluence Engine.

Institutional traders never trade on a single timeframe. This module
analyzes multiple timeframes simultaneously and only generates signals
when multiple timeframes agree — dramatically reducing false signals.

Timeframe hierarchy (crypto 24/7 markets):
  - 1 minute:  Execution timing, scalp entries
  - 5 minute:  Short-term momentum, scalp confirmation
  - 15 minute: Intraday trend direction
  - 1 hour:    Swing trend direction, key S/R levels

A signal is strongest when the higher timeframes set the bias
and lower timeframes provide the entry trigger.
"""

from dataclasses import dataclass
from quant.engine import QuantEngine, MarketAssessment
from data.market_data import MarketDataFetcher
from utils.logger import setup_logger

logger = setup_logger("multi_tf")

TIMEFRAMES = ["ONE_MINUTE", "FIVE_MINUTE", "FIFTEEN_MINUTE", "ONE_HOUR"]
TF_WEIGHTS = {
    "ONE_MINUTE": 0.15,
    "FIVE_MINUTE": 0.25,
    "FIFTEEN_MINUTE": 0.30,
    "ONE_HOUR": 0.30,
}


@dataclass
class ConfluenceSignal:
    product_id: str
    direction: str          # "buy", "sell", or "neutral"
    strength: float         # 0 to 1
    timeframes_aligned: int
    dominant_regime: str
    entry_assessment: MarketAssessment | None  # 1-min assessment for timing
    reason: str


class MultiTimeframeEngine:
    def __init__(self, quant: QuantEngine, data: MarketDataFetcher):
        self.quant = quant
        self.data = data

    def evaluate(self, product_id: str, bid_depth: float = 0,
                 ask_depth: float = 0, win_rate: float = 0.5,
                 avg_win: float = 1.0, avg_loss: float = 1.0) -> ConfluenceSignal:
        """Analyze all timeframes and produce a confluence signal."""
        assessments: dict[str, MarketAssessment] = {}

        for tf in TIMEFRAMES:
            candle_count = {"ONE_MINUTE": 100, "FIVE_MINUTE": 80,
                            "FIFTEEN_MINUTE": 60, "ONE_HOUR": 52}.get(tf, 60)
            df = self.data.fetch_candles(product_id, tf, candle_count)
            if df.empty or len(df) < 30:
                continue
            a = self.quant.analyze(
                f"{product_id}_{tf}", df,
                bid_depth=bid_depth, ask_depth=ask_depth,
                win_rate=win_rate, avg_win=avg_win, avg_loss=avg_loss,
            )
            assessments[tf] = a

        if not assessments:
            return ConfluenceSignal(
                product_id=product_id, direction="neutral", strength=0,
                timeframes_aligned=0, dominant_regime="unknown",
                entry_assessment=None, reason="Insufficient data",
            )

        # Weighted buy/sell aggregation
        weighted_buy = 0.0
        weighted_sell = 0.0
        total_weight = 0.0
        buy_aligned = 0
        sell_aligned = 0
        regimes = []
        reasons = []

        for tf, a in assessments.items():
            w = TF_WEIGHTS.get(tf, 0.2)
            weighted_buy += a.buy_score * w
            weighted_sell += a.sell_score * w
            total_weight += w
            if a.buy_score > a.sell_score and a.buy_score > 0.3:
                buy_aligned += 1
                reasons.append(f"{tf}: buy({a.buy_score:.2f})")
            elif a.sell_score > a.buy_score and a.sell_score > 0.3:
                sell_aligned += 1
                reasons.append(f"{tf}: sell({a.sell_score:.2f})")
            else:
                reasons.append(f"{tf}: neutral")
            regimes.append(a.regime)

        if total_weight > 0:
            weighted_buy /= total_weight
            weighted_sell /= total_weight

        # Determine dominant regime
        regime_counts = {}
        for r in regimes:
            regime_counts[r] = regime_counts.get(r, 0) + 1
        dominant_regime = max(regime_counts, key=regime_counts.get) if regime_counts else "random"

        # Direction and strength
        tf_count = len(assessments)
        if weighted_buy > weighted_sell and buy_aligned >= 2:
            direction = "buy"
            strength = weighted_buy * (buy_aligned / tf_count)
        elif weighted_sell > weighted_buy and sell_aligned >= 2:
            direction = "sell"
            strength = weighted_sell * (sell_aligned / tf_count)
        else:
            direction = "neutral"
            strength = 0.0

        # Boost if higher timeframes agree
        htf = ["FIFTEEN_MINUTE", "ONE_HOUR"]
        htf_agree = all(
            assessments.get(tf) and
            ((direction == "buy" and assessments[tf].buy_score > assessments[tf].sell_score) or
             (direction == "sell" and assessments[tf].sell_score > assessments[tf].buy_score))
            for tf in htf if tf in assessments
        )
        if htf_agree and direction != "neutral":
            strength = min(1.0, strength * 1.3)
            reasons.append("HTF confirmation")

        # Entry timing from 1-min
        entry_assessment = assessments.get("ONE_MINUTE")

        signal = ConfluenceSignal(
            product_id=product_id,
            direction=direction,
            strength=round(strength, 4),
            timeframes_aligned=max(buy_aligned, sell_aligned),
            dominant_regime=dominant_regime,
            entry_assessment=entry_assessment,
            reason=" | ".join(reasons),
        )

        logger.info(
            f"MTF {product_id} | dir={signal.direction} | str={signal.strength:.3f} | "
            f"aligned={signal.timeframes_aligned}/{tf_count} | regime={dominant_regime} | "
            f"{signal.reason}"
        )
        return signal
