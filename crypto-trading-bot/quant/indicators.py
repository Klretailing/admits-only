"""Advanced technical indicators used by the quant engine.

Implements institutional-grade indicator computations with proper
numerical stability and edge-case handling.
"""

import numpy as np
import pandas as pd


def ema(series: pd.Series, period: int) -> pd.Series:
    """Exponential moving average with proper warmup."""
    return series.ewm(span=period, adjust=False).mean()


def sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period).mean()


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """Wilder's RSI — the standard, not the exponential variant."""
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """MACD line, signal line, and histogram."""
    fast_ema = ema(close, fast)
    slow_ema = ema(close, slow)
    macd_line = fast_ema - slow_ema
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def stochastic(high: pd.Series, low: pd.Series, close: pd.Series,
               k_period: int = 14, d_period: int = 3):
    """Stochastic %K and %D."""
    lowest_low = low.rolling(window=k_period).min()
    highest_high = high.rolling(window=k_period).max()
    denom = highest_high - lowest_low
    k = 100 * (close - lowest_low) / denom.replace(0, np.nan)
    d = sma(k, d_period)
    return k, d


def bollinger_bands(close: pd.Series, period: int = 20, std_dev: float = 2.0):
    """Bollinger Bands: upper, middle, lower."""
    middle = sma(close, period)
    rolling_std = close.rolling(window=period).std()
    upper = middle + std_dev * rolling_std
    lower = middle - std_dev * rolling_std
    return upper, middle, lower


def bollinger_bandwidth(upper: pd.Series, lower: pd.Series, middle: pd.Series) -> pd.Series:
    """Bollinger bandwidth — measures volatility squeeze."""
    return (upper - lower) / middle.replace(0, np.nan) * 100


def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Average True Range."""
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()


def vwap(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series) -> pd.Series:
    """Volume-Weighted Average Price."""
    typical_price = (high + low + close) / 3
    cumulative_tp_vol = (typical_price * volume).cumsum()
    cumulative_vol = volume.cumsum()
    return cumulative_tp_vol / cumulative_vol.replace(0, np.nan)


def adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Average Directional Index — measures trend strength regardless of direction."""
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm = plus_dm.where((plus_dm > minus_dm) & (plus_dm > 0), 0.0)
    minus_dm = minus_dm.where((minus_dm > plus_dm) & (minus_dm > 0), 0.0)
    atr_vals = atr(high, low, close, period)
    plus_di = 100 * ema(plus_dm, period) / atr_vals.replace(0, np.nan)
    minus_di = 100 * ema(minus_dm, period) / atr_vals.replace(0, np.nan)
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return ema(dx, period)


def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """On-Balance Volume — tracks cumulative buying/selling pressure."""
    direction = close.diff().apply(lambda x: 1 if x > 0 else (-1 if x < 0 else 0))
    return (volume * direction).cumsum()


def mfi(high: pd.Series, low: pd.Series, close: pd.Series,
        volume: pd.Series, period: int = 14) -> pd.Series:
    """Money Flow Index — volume-weighted RSI."""
    typical_price = (high + low + close) / 3
    money_flow = typical_price * volume
    delta = typical_price.diff()
    pos_flow = money_flow.where(delta > 0, 0.0).rolling(period).sum()
    neg_flow = money_flow.where(delta <= 0, 0.0).rolling(period).sum()
    ratio = pos_flow / neg_flow.replace(0, np.nan)
    return 100 - (100 / (1 + ratio))


def ichimoku(high: pd.Series, low: pd.Series, close: pd.Series,
             tenkan: int = 9, kijun: int = 26, senkou_b: int = 52):
    """Ichimoku Cloud components."""
    tenkan_sen = (high.rolling(tenkan).max() + low.rolling(tenkan).min()) / 2
    kijun_sen = (high.rolling(kijun).max() + low.rolling(kijun).min()) / 2
    senkou_a = ((tenkan_sen + kijun_sen) / 2).shift(kijun)
    senkou_b_line = ((high.rolling(senkou_b).max() + low.rolling(senkou_b).min()) / 2).shift(kijun)
    chikou = close.shift(-kijun)
    return tenkan_sen, kijun_sen, senkou_a, senkou_b_line, chikou


def fibonacci_retracement(swing_high: float, swing_low: float) -> dict[str, float]:
    """Fibonacci retracement levels from a swing high/low pair."""
    diff = swing_high - swing_low
    return {
        "0.0": swing_high,
        "0.236": swing_high - 0.236 * diff,
        "0.382": swing_high - 0.382 * diff,
        "0.5": swing_high - 0.5 * diff,
        "0.618": swing_high - 0.618 * diff,
        "0.786": swing_high - 0.786 * diff,
        "1.0": swing_low,
    }


def heikin_ashi(open_: pd.Series, high: pd.Series, low: pd.Series, close: pd.Series):
    """Heikin-Ashi candles — smoothed trend visualization."""
    ha_close = (open_ + high + low + close) / 4
    ha_open = pd.Series(np.nan, index=open_.index, dtype=float)
    ha_open.iloc[0] = (open_.iloc[0] + close.iloc[0]) / 2
    for i in range(1, len(ha_open)):
        ha_open.iloc[i] = (ha_open.iloc[i - 1] + ha_close.iloc[i - 1]) / 2
    ha_high = pd.concat([high, ha_open, ha_close], axis=1).max(axis=1)
    ha_low = pd.concat([low, ha_open, ha_close], axis=1).min(axis=1)
    return ha_open, ha_high, ha_low, ha_close


def zscore(series: pd.Series, period: int = 20) -> pd.Series:
    """Rolling z-score — measures how many standard deviations from the mean."""
    mean = series.rolling(period).mean()
    std = series.rolling(period).std()
    return (series - mean) / std.replace(0, np.nan)


def keltner_channels(high: pd.Series, low: pd.Series, close: pd.Series,
                     ema_period: int = 20, atr_period: int = 14, multiplier: float = 2.0):
    """Keltner Channels — ATR-based volatility bands."""
    middle = ema(close, ema_period)
    atr_vals = atr(high, low, close, atr_period)
    upper = middle + multiplier * atr_vals
    lower = middle - multiplier * atr_vals
    return upper, middle, lower


def volume_profile_poc(close: pd.Series, volume: pd.Series, bins: int = 50) -> float:
    """Point of Control — the price level with the highest traded volume."""
    if close.empty:
        return 0.0
    price_min, price_max = close.min(), close.max()
    if price_min == price_max:
        return float(price_min)
    bin_edges = np.linspace(price_min, price_max, bins + 1)
    bin_indices = np.digitize(close.values, bin_edges) - 1
    bin_indices = np.clip(bin_indices, 0, bins - 1)
    vol_by_bin = np.zeros(bins)
    for i, bi in enumerate(bin_indices):
        vol_by_bin[bi] += volume.values[i]
    poc_bin = np.argmax(vol_by_bin)
    return float((bin_edges[poc_bin] + bin_edges[poc_bin + 1]) / 2)
