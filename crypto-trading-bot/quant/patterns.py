"""Candlestick and chart pattern recognition.

Detects high-probability setups used by institutional traders:
- Candlestick patterns (engulfing, hammer, doji, morning star)
- Chart patterns (double bottom/top, head & shoulders)
- Support/resistance zones
- Swing highs/lows for Fibonacci analysis
"""

import numpy as np
import pandas as pd


def detect_engulfing(open_: pd.Series, close: pd.Series) -> pd.Series:
    """Bullish/bearish engulfing. Returns +1 (bullish), -1 (bearish), 0 (none)."""
    result = pd.Series(0, index=open_.index)
    prev_body = close.shift(1) - open_.shift(1)
    curr_body = close - open_
    # Bullish engulfing: prev bearish, current bullish body engulfs previous
    bullish = (prev_body < 0) & (curr_body > 0) & (open_ <= close.shift(1)) & (close >= open_.shift(1))
    bearish = (prev_body > 0) & (curr_body < 0) & (open_ >= close.shift(1)) & (close <= open_.shift(1))
    result[bullish] = 1
    result[bearish] = -1
    return result


def detect_hammer(open_: pd.Series, high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    """Hammer / hanging man pattern. Returns +1 (hammer/bullish), -1 (inverted), 0."""
    body = (close - open_).abs()
    upper_shadow = high - pd.concat([close, open_], axis=1).max(axis=1)
    lower_shadow = pd.concat([close, open_], axis=1).min(axis=1) - low
    candle_range = high - low
    result = pd.Series(0, index=open_.index)
    # Hammer: small body at top, long lower wick (>=2x body)
    is_hammer = (lower_shadow >= 2 * body) & (upper_shadow < body * 0.5) & (candle_range > 0)
    # Inverted hammer: small body at bottom, long upper wick
    is_inverted = (upper_shadow >= 2 * body) & (lower_shadow < body * 0.5) & (candle_range > 0)
    result[is_hammer] = 1
    result[is_inverted] = -1
    return result


def detect_doji(open_: pd.Series, high: pd.Series, low: pd.Series,
                close: pd.Series, threshold: float = 0.05) -> pd.Series:
    """Doji: open and close nearly identical relative to range. Returns 1 if doji."""
    body = (close - open_).abs()
    candle_range = high - low
    ratio = body / candle_range.replace(0, np.nan)
    return (ratio < threshold).astype(int)


def detect_morning_star(open_: pd.Series, high: pd.Series, low: pd.Series,
                        close: pd.Series) -> pd.Series:
    """Morning star (bullish reversal) and evening star (bearish). +1/-1/0."""
    result = pd.Series(0, index=open_.index)
    body_1 = close.shift(2) - open_.shift(2)
    body_2 = (close.shift(1) - open_.shift(1)).abs()
    body_3 = close - open_
    range_1 = (high.shift(2) - low.shift(2)).replace(0, np.nan)
    # Morning star: large bearish, small body, large bullish
    morning = (
        (body_1 < -range_1 * 0.3) &
        (body_2 < range_1.abs() * 0.2) &
        (body_3 > range_1.abs() * 0.3)
    )
    # Evening star: large bullish, small body, large bearish
    evening = (
        (body_1 > range_1.abs() * 0.3) &
        (body_2 < range_1.abs() * 0.2) &
        (body_3 < -range_1.abs() * 0.3)
    )
    result[morning] = 1
    result[evening] = -1
    return result


def find_swing_points(high: pd.Series, low: pd.Series, lookback: int = 5):
    """Find swing highs and swing lows for Fibonacci and S/R analysis."""
    swing_highs = []
    swing_lows = []
    for i in range(lookback, len(high) - lookback):
        # Swing high: highest point in the window
        if high.iloc[i] == high.iloc[i - lookback:i + lookback + 1].max():
            swing_highs.append((high.index[i], float(high.iloc[i])))
        if low.iloc[i] == low.iloc[i - lookback:i + lookback + 1].min():
            swing_lows.append((low.index[i], float(low.iloc[i])))
    return swing_highs, swing_lows


def find_support_resistance(close: pd.Series, volume: pd.Series,
                            bins: int = 80, top_n: int = 5) -> list[float]:
    """Find support/resistance levels using volume-at-price clustering."""
    if close.empty:
        return []
    price_min, price_max = close.min(), close.max()
    if price_min == price_max:
        return [float(price_min)]
    bin_edges = np.linspace(price_min, price_max, bins + 1)
    bin_indices = np.digitize(close.values, bin_edges) - 1
    bin_indices = np.clip(bin_indices, 0, bins - 1)
    vol_by_bin = np.zeros(bins)
    for i, bi in enumerate(bin_indices):
        vol_by_bin[bi] += volume.values[i]
    top_bins = np.argsort(vol_by_bin)[-top_n:]
    levels = [(bin_edges[b] + bin_edges[b + 1]) / 2 for b in sorted(top_bins)]
    return [float(l) for l in levels]


def detect_double_bottom(close: pd.Series, tolerance: float = 0.02) -> bool:
    """Detect a double-bottom pattern in recent price action.

    Two lows within `tolerance` percent of each other with a peak between them.
    """
    if len(close) < 20:
        return False
    vals = close.values
    mid = len(vals) // 2
    first_half = vals[:mid]
    second_half = vals[mid:]
    low1 = np.min(first_half)
    low2 = np.min(second_half)
    peak = np.max(vals[np.argmin(first_half):mid + np.argmin(second_half)])
    if low1 == 0:
        return False
    pct_diff = abs(low1 - low2) / low1
    if pct_diff < tolerance and peak > low1 * 1.01:
        return True
    return False


def detect_double_top(close: pd.Series, tolerance: float = 0.02) -> bool:
    """Detect a double-top pattern in recent price action."""
    if len(close) < 20:
        return False
    vals = close.values
    mid = len(vals) // 2
    first_half = vals[:mid]
    second_half = vals[mid:]
    high1 = np.max(first_half)
    high2 = np.max(second_half)
    trough = np.min(vals[np.argmax(first_half):mid + np.argmax(second_half)])
    if high1 == 0:
        return False
    pct_diff = abs(high1 - high2) / high1
    if pct_diff < tolerance and trough < high1 * 0.99:
        return True
    return False


def order_flow_imbalance(bid_depth: float, ask_depth: float) -> float:
    """Order flow imbalance ratio. Positive = buying pressure, negative = selling.

    Range: -1.0 to +1.0
    """
    total = bid_depth + ask_depth
    if total == 0:
        return 0.0
    return (bid_depth - ask_depth) / total
