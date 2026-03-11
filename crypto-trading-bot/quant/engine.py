"""Quant Analysis Engine — the brain of the trading bot.

Performs multi-timeframe analysis, regime detection, pattern recognition,
and generates a comprehensive market assessment for each asset. Strategies
consult this engine before making trade decisions.

Thinks like a senior quant PM at a systematic fund:
- What regime are we in? (trending / mean-reverting / choppy)
- What's the volatility regime? (expanding / contracting / normal)
- Where are the key levels? (S/R, Fibonacci, VWAP, POC)
- What do the order-flow and volume signals say?
- Are candlestick patterns confirming or diverging?
- What's the cross-asset correlation picture?
- What's the optimal position size given current conditions?
"""

from dataclasses import dataclass, field
import pandas as pd
from quant import indicators as ind
from quant import patterns as pat
from quant import statistics as qstat
from utils.logger import setup_logger

logger = setup_logger("quant_engine")


@dataclass
class MarketAssessment:
    """Complete quantitative assessment of a single asset at a point in time."""
    product_id: str
    price: float

    # Regime
    regime: str = "random"              # trending / mean_reverting / random
    hurst: float = 0.5
    trend_strength: float = 0.0         # ADX value

    # Volatility
    realized_vol: float = 0.0
    gk_vol: float = 0.0
    vol_regime: str = "normal"          # expanding / contracting / normal
    bb_bandwidth: float = 0.0
    atr_value: float = 0.0

    # Momentum indicators
    rsi: float = 50.0
    macd_signal: int = 0                # +1 bullish crossover, -1 bearish, 0 neutral
    macd_histogram: float = 0.0
    stoch_k: float = 50.0
    stoch_d: float = 50.0
    mfi: float = 50.0                   # Money Flow Index

    # Trend indicators
    ema_stack: str = "neutral"          # bullish / bearish / neutral
    price_vs_vwap: float = 0.0         # % above/below VWAP
    ichimoku_signal: int = 0           # +1 above cloud, -1 below, 0 inside

    # Levels
    support_levels: list[float] = field(default_factory=list)
    resistance_levels: list[float] = field(default_factory=list)
    fibonacci_levels: dict[str, float] = field(default_factory=dict)
    poc: float = 0.0                   # Point of Control from volume profile

    # Patterns
    engulfing: int = 0
    hammer: int = 0
    doji: int = 0
    morning_star: int = 0
    double_bottom: bool = False
    double_top: bool = False

    # Statistical
    skewness: float = 0.0
    kurtosis: float = 0.0
    var_95: float = 0.0
    sharpe: float = 0.0
    kelly_fraction: float = 0.0

    # Order flow
    order_flow_imbalance: float = 0.0
    obv_trend: int = 0                 # +1 rising, -1 falling, 0 flat

    # Composite scores
    buy_score: float = 0.0             # 0 to 1
    sell_score: float = 0.0            # 0 to 1
    confidence: float = 0.0            # overall confidence in the assessment


class QuantEngine:
    """Performs comprehensive quantitative analysis on market data."""

    def __init__(self):
        self.assessments: dict[str, MarketAssessment] = {}

    def analyze(self, product_id: str, df: pd.DataFrame,
                bid_depth: float = 0, ask_depth: float = 0,
                win_rate: float = 0.5, avg_win: float = 1.0,
                avg_loss: float = 1.0) -> MarketAssessment:
        """Run full quantitative analysis on a DataFrame of OHLCV candles.

        The df must have columns: open, high, low, close, volume
        """
        if df.empty or len(df) < 30:
            return MarketAssessment(product_id=product_id, price=0.0)

        o, h, l, c, v = df["open"], df["high"], df["low"], df["close"], df["volume"]
        price = float(c.iloc[-1])
        a = MarketAssessment(product_id=product_id, price=price)

        # ── Regime Detection ──
        a.hurst = qstat.hurst_exponent(c)
        a.regime = qstat.detect_regime(c)
        adx_series = ind.adx(h, l, c)
        a.trend_strength = float(adx_series.iloc[-1]) if not adx_series.empty else 0

        # ── Volatility Analysis ──
        rv = qstat.realized_volatility(c)
        a.realized_vol = float(rv.iloc[-1]) if not rv.empty and pd.notna(rv.iloc[-1]) else 0
        gk = qstat.garman_klass_volatility(o, h, l, c)
        a.gk_vol = float(gk.iloc[-1]) if not gk.empty and pd.notna(gk.iloc[-1]) else 0
        atr_series = ind.atr(h, l, c)
        a.atr_value = float(atr_series.iloc[-1]) if not atr_series.empty and pd.notna(atr_series.iloc[-1]) else 0

        bb_upper, bb_mid, bb_lower = ind.bollinger_bands(c)
        bw = ind.bollinger_bandwidth(bb_upper, bb_lower, bb_mid)
        a.bb_bandwidth = float(bw.iloc[-1]) if not bw.empty and pd.notna(bw.iloc[-1]) else 0
        # Keltner squeeze detection
        kc_upper, _, kc_lower = ind.keltner_channels(h, l, c)
        if not kc_upper.empty and not bb_upper.empty:
            is_squeeze = (bb_upper.iloc[-1] < kc_upper.iloc[-1]) and (bb_lower.iloc[-1] > kc_lower.iloc[-1])
            a.vol_regime = "contracting" if is_squeeze else (
                "expanding" if a.bb_bandwidth > 5 else "normal"
            )

        # ── Momentum ──
        rsi_series = ind.rsi(c)
        a.rsi = float(rsi_series.iloc[-1]) if not rsi_series.empty and pd.notna(rsi_series.iloc[-1]) else 50
        macd_line, macd_sig, macd_hist = ind.macd(c)
        if not macd_line.empty and len(macd_line) >= 2:
            a.macd_histogram = float(macd_hist.iloc[-1]) if pd.notna(macd_hist.iloc[-1]) else 0
            prev_hist = float(macd_hist.iloc[-2]) if pd.notna(macd_hist.iloc[-2]) else 0
            if a.macd_histogram > 0 and prev_hist <= 0:
                a.macd_signal = 1
            elif a.macd_histogram < 0 and prev_hist >= 0:
                a.macd_signal = -1

        stoch_k, stoch_d = ind.stochastic(h, l, c)
        a.stoch_k = float(stoch_k.iloc[-1]) if not stoch_k.empty and pd.notna(stoch_k.iloc[-1]) else 50
        a.stoch_d = float(stoch_d.iloc[-1]) if not stoch_d.empty and pd.notna(stoch_d.iloc[-1]) else 50

        mfi_series = ind.mfi(h, l, c, v)
        a.mfi = float(mfi_series.iloc[-1]) if not mfi_series.empty and pd.notna(mfi_series.iloc[-1]) else 50

        # ── Trend ──
        ema9 = ind.ema(c, 9)
        ema21 = ind.ema(c, 21)
        ema50 = ind.ema(c, 50) if len(c) >= 50 else ema21
        if not ema9.empty and not ema21.empty:
            e9, e21 = float(ema9.iloc[-1]), float(ema21.iloc[-1])
            e50 = float(ema50.iloc[-1])
            if e9 > e21 > e50:
                a.ema_stack = "bullish"
            elif e9 < e21 < e50:
                a.ema_stack = "bearish"

        vwap_series = ind.vwap(h, l, c, v)
        if not vwap_series.empty and pd.notna(vwap_series.iloc[-1]):
            vwap_val = float(vwap_series.iloc[-1])
            if vwap_val > 0:
                a.price_vs_vwap = (price - vwap_val) / vwap_val * 100

        # Ichimoku
        if len(c) >= 52:
            tenkan, kijun, senkou_a, senkou_b, _ = ind.ichimoku(h, l, c)
            sa = float(senkou_a.iloc[-1]) if pd.notna(senkou_a.iloc[-1]) else price
            sb = float(senkou_b.iloc[-1]) if pd.notna(senkou_b.iloc[-1]) else price
            cloud_top = max(sa, sb)
            cloud_bottom = min(sa, sb)
            if price > cloud_top:
                a.ichimoku_signal = 1
            elif price < cloud_bottom:
                a.ichimoku_signal = -1

        # ── Key Levels ──
        sr_levels = pat.find_support_resistance(c, v)
        a.support_levels = [l for l in sr_levels if l < price]
        a.resistance_levels = [l for l in sr_levels if l > price]
        a.poc = ind.volume_profile_poc(c, v)

        swing_highs, swing_lows = pat.find_swing_points(h, l)
        if swing_highs and swing_lows:
            latest_high = swing_highs[-1][1]
            latest_low = swing_lows[-1][1]
            a.fibonacci_levels = ind.fibonacci_retracement(latest_high, latest_low)

        # ── Patterns ──
        eng = pat.detect_engulfing(o, c)
        a.engulfing = int(eng.iloc[-1]) if not eng.empty else 0
        ham = pat.detect_hammer(o, h, l, c)
        a.hammer = int(ham.iloc[-1]) if not ham.empty else 0
        doj = pat.detect_doji(o, h, l, c)
        a.doji = int(doj.iloc[-1]) if not doj.empty else 0
        ms = pat.detect_morning_star(o, h, l, c)
        a.morning_star = int(ms.iloc[-1]) if not ms.empty else 0
        a.double_bottom = pat.detect_double_bottom(c)
        a.double_top = pat.detect_double_top(c)

        # ── Statistics ──
        a.skewness = qstat.return_skewness(c)
        a.kurtosis = qstat.return_kurtosis(c)
        a.var_95 = qstat.tail_risk_var(c)
        a.sharpe = qstat.sharpe_ratio(c)
        a.kelly_fraction = qstat.kelly_criterion(win_rate, avg_win, avg_loss)

        # ── Order Flow ──
        a.order_flow_imbalance = pat.order_flow_imbalance(bid_depth, ask_depth)
        obv_series = ind.obv(c, v)
        if len(obv_series) >= 5:
            obv_slope = obv_series.iloc[-1] - obv_series.iloc[-5]
            a.obv_trend = 1 if obv_slope > 0 else (-1 if obv_slope < 0 else 0)

        # ── Composite Scoring ──
        a.buy_score, a.sell_score, a.confidence = self._score(a)

        self.assessments[product_id] = a
        return a

    def _score(self, a: MarketAssessment) -> tuple[float, float, float]:
        """Compute composite buy/sell scores from all signals.

        Each signal contributes a weighted vote. The weights reflect empirical
        reliability of each indicator in crypto markets.
        """
        buy = 0.0
        sell = 0.0
        total_weight = 0.0

        def vote(weight: float, buy_cond: bool, sell_cond: bool):
            nonlocal buy, sell, total_weight
            total_weight += weight
            if buy_cond:
                buy += weight
            elif sell_cond:
                sell += weight

        # RSI (weight: 0.10)
        vote(0.10, a.rsi < 30, a.rsi > 70)

        # MACD crossover (weight: 0.12)
        vote(0.12, a.macd_signal == 1, a.macd_signal == -1)

        # Stochastic (weight: 0.06)
        vote(0.06, a.stoch_k < 20 and a.stoch_k > a.stoch_d, a.stoch_k > 80 and a.stoch_k < a.stoch_d)

        # EMA stack (weight: 0.12)
        vote(0.12, a.ema_stack == "bullish", a.ema_stack == "bearish")

        # VWAP (weight: 0.08)
        vote(0.08, a.price_vs_vwap < -0.3, a.price_vs_vwap > 0.3)

        # Ichimoku (weight: 0.08)
        vote(0.08, a.ichimoku_signal == 1, a.ichimoku_signal == -1)

        # ADX trend strength (weight: 0.06)
        vote(0.06, a.trend_strength > 25 and a.ema_stack == "bullish",
             a.trend_strength > 25 and a.ema_stack == "bearish")

        # MFI (weight: 0.06)
        vote(0.06, a.mfi < 25, a.mfi > 75)

        # Order flow (weight: 0.10)
        vote(0.10, a.order_flow_imbalance > 0.3, a.order_flow_imbalance < -0.3)

        # OBV trend (weight: 0.06)
        vote(0.06, a.obv_trend == 1, a.obv_trend == -1)

        # Candlestick patterns (weight: 0.08)
        bullish_candle = a.engulfing == 1 or a.hammer == 1 or a.morning_star == 1
        bearish_candle = a.engulfing == -1 or a.hammer == -1 or a.morning_star == -1
        vote(0.08, bullish_candle, bearish_candle)

        # Chart patterns (weight: 0.08)
        vote(0.08, a.double_bottom, a.double_top)

        # Normalize
        buy_score = buy / total_weight if total_weight > 0 else 0
        sell_score = sell / total_weight if total_weight > 0 else 0

        # Confidence: how decisive the signals are (agreement)
        spread = abs(buy_score - sell_score)
        confidence = min(1.0, spread * 2)

        # Penalize confidence during random/choppy regimes
        if a.regime == "random":
            confidence *= 0.6
        # Penalize if high kurtosis (fat tails, unpredictable)
        if a.kurtosis > 5:
            confidence *= 0.8

        return round(buy_score, 4), round(sell_score, 4), round(confidence, 4)

    def get_assessment(self, product_id: str) -> MarketAssessment | None:
        return self.assessments.get(product_id)

    def log_assessment(self, a: MarketAssessment):
        logger.info(
            f"QUANT {a.product_id} | price={a.price:.2f} | regime={a.regime} "
            f"(H={a.hurst:.2f}) | vol={a.vol_regime} (ATR={a.atr_value:.4f}) | "
            f"RSI={a.rsi:.1f} | MACD={a.macd_signal} | EMA={a.ema_stack} | "
            f"ichimoku={a.ichimoku_signal} | OFI={a.order_flow_imbalance:.2f} | "
            f"BUY={a.buy_score:.3f} SELL={a.sell_score:.3f} conf={a.confidence:.3f}"
        )
