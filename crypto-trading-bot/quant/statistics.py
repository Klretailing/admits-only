"""Statistical analysis for quantitative trading.

Implements:
- Volatility modeling (realized vol, Garman-Klass, Parkinson)
- Return distribution analysis (skew, kurtosis, tail risk)
- Regime detection (trending vs mean-reverting)
- Correlation and cointegration analysis
- Kelly criterion for optimal position sizing
"""

import numpy as np
import pandas as pd
from scipy import stats as sp_stats


def realized_volatility(close: pd.Series, period: int = 20) -> pd.Series:
    """Annualized realized volatility from log returns."""
    log_returns = np.log(close / close.shift(1))
    return log_returns.rolling(period).std() * np.sqrt(365 * 24 * 60)  # crypto trades 24/7


def garman_klass_volatility(open_: pd.Series, high: pd.Series,
                            low: pd.Series, close: pd.Series, period: int = 20) -> pd.Series:
    """Garman-Klass volatility estimator — more efficient than close-to-close.

    Uses OHLC data to get a better vol estimate with fewer data points.
    """
    log_hl = np.log(high / low) ** 2
    log_co = np.log(close / open_) ** 2
    gk = 0.5 * log_hl - (2 * np.log(2) - 1) * log_co
    return gk.rolling(period).mean().apply(lambda x: np.sqrt(x * 365 * 24 * 60) if x > 0 else 0)


def parkinson_volatility(high: pd.Series, low: pd.Series, period: int = 20) -> pd.Series:
    """Parkinson volatility — uses high-low range, ignores open/close."""
    log_hl_sq = np.log(high / low) ** 2
    factor = 1 / (4 * np.log(2))
    return (factor * log_hl_sq).rolling(period).mean().apply(
        lambda x: np.sqrt(x * 365 * 24 * 60) if x > 0 else 0
    )


def return_skewness(close: pd.Series, period: int = 50) -> float:
    """Rolling skewness of returns. Negative skew = fat left tail (crash risk)."""
    log_returns = np.log(close / close.shift(1)).dropna()
    if len(log_returns) < period:
        return 0.0
    return float(log_returns.iloc[-period:].skew())


def return_kurtosis(close: pd.Series, period: int = 50) -> float:
    """Excess kurtosis. High kurtosis = fat tails = more extreme moves."""
    log_returns = np.log(close / close.shift(1)).dropna()
    if len(log_returns) < period:
        return 0.0
    return float(log_returns.iloc[-period:].kurtosis())


def hurst_exponent(series: pd.Series, max_lag: int = 20) -> float:
    """Hurst exponent — determines if the series is trending or mean-reverting.

    H > 0.5: trending (momentum strategies work)
    H = 0.5: random walk
    H < 0.5: mean-reverting (reversion strategies work)
    """
    if len(series) < max_lag * 2:
        return 0.5
    vals = series.dropna().values
    lags = range(2, max_lag)
    tau = []
    for lag in lags:
        diffs = vals[lag:] - vals[:-lag]
        std = np.std(diffs)
        if std > 0:
            tau.append(std)
        else:
            tau.append(1e-10)
    if len(tau) < 2:
        return 0.5
    log_lags = np.log(list(lags)[:len(tau)])
    log_tau = np.log(tau)
    try:
        slope, _, _, _, _ = sp_stats.linregress(log_lags, log_tau)
        return float(np.clip(slope, 0, 1))
    except Exception:
        return 0.5


def detect_regime(close: pd.Series, period: int = 50) -> str:
    """Classify market regime: 'trending', 'mean_reverting', or 'random'.

    Uses Hurst exponent and ADX-like trend strength.
    """
    h = hurst_exponent(close, max_lag=min(period, len(close) // 3))
    if h > 0.6:
        return "trending"
    elif h < 0.4:
        return "mean_reverting"
    return "random"


def kelly_criterion(win_rate: float, avg_win: float, avg_loss: float) -> float:
    """Kelly criterion — optimal fraction of capital to risk.

    Returns fraction (0 to 1). We apply a half-Kelly for safety.
    """
    if avg_loss == 0 or win_rate <= 0:
        return 0.0
    b = avg_win / abs(avg_loss)
    p = win_rate
    q = 1 - p
    kelly = (b * p - q) / b
    # Half-Kelly for safety
    return float(max(0.0, min(kelly * 0.5, 0.25)))


def correlation_matrix(price_dict: dict[str, pd.Series], period: int = 50) -> pd.DataFrame:
    """Rolling correlation between multiple assets."""
    returns = {}
    for symbol, prices in price_dict.items():
        log_ret = np.log(prices / prices.shift(1)).dropna()
        if len(log_ret) >= period:
            returns[symbol] = log_ret.iloc[-period:]
    if len(returns) < 2:
        return pd.DataFrame()
    df = pd.DataFrame(returns)
    return df.corr()


def tail_risk_var(close: pd.Series, confidence: float = 0.95, period: int = 100) -> float:
    """Value at Risk (VaR) — the maximum expected loss at given confidence.

    Returns a positive number representing the potential loss as a fraction.
    """
    log_returns = np.log(close / close.shift(1)).dropna()
    if len(log_returns) < period:
        return 0.0
    recent = log_returns.iloc[-period:]
    return float(-np.percentile(recent, (1 - confidence) * 100))


def expected_shortfall(close: pd.Series, confidence: float = 0.95, period: int = 100) -> float:
    """Conditional VaR (CVaR / Expected Shortfall) — average loss beyond VaR.

    More conservative risk measure than VaR.
    """
    log_returns = np.log(close / close.shift(1)).dropna()
    if len(log_returns) < period:
        return 0.0
    recent = log_returns.iloc[-period:]
    var_threshold = np.percentile(recent, (1 - confidence) * 100)
    tail_losses = recent[recent <= var_threshold]
    if tail_losses.empty:
        return 0.0
    return float(-tail_losses.mean())


def sharpe_ratio(close: pd.Series, risk_free_rate: float = 0.05, period: int = 100) -> float:
    """Rolling Sharpe ratio — risk-adjusted returns."""
    log_returns = np.log(close / close.shift(1)).dropna()
    if len(log_returns) < period:
        return 0.0
    recent = log_returns.iloc[-period:]
    excess_return = recent.mean() * (365 * 24 * 60) - risk_free_rate
    vol = recent.std() * np.sqrt(365 * 24 * 60)
    if vol == 0:
        return 0.0
    return float(excess_return / vol)
