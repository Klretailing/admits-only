import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class CoinbaseConfig:
    api_key: str = os.getenv("COINBASE_API_KEY", "")
    api_secret: str = os.getenv("COINBASE_API_SECRET", "")


@dataclass
class RiskConfig:
    max_portfolio_percent_per_trade: float = float(
        os.getenv("MAX_PORTFOLIO_PERCENT_PER_TRADE", "2.0")
    )
    max_daily_loss_percent: float = float(
        os.getenv("MAX_DAILY_LOSS_PERCENT", "3.0")
    )
    max_drawdown_percent: float = float(
        os.getenv("MAX_DRAWDOWN_PERCENT", "5.0")
    )
    trailing_stop_percent: float = 1.5
    max_open_positions: int = 5
    min_profit_target_percent: float = 0.3
    cooldown_after_loss_seconds: int = 300


@dataclass
class TradingConfig:
    pairs: list[str] = field(default_factory=lambda: [
        p.strip()
        for p in os.getenv("TRADING_PAIRS", "BTC-USD,ETH-USD,SOL-USD").split(",")
    ])
    enable_scalper: bool = os.getenv("ENABLE_SCALPER", "true").lower() == "true"
    enable_momentum: bool = os.getenv("ENABLE_MOMENTUM", "true").lower() == "true"
    enable_mean_reversion: bool = (
        os.getenv("ENABLE_MEAN_REVERSION", "true").lower() == "true"
    )
    scan_interval_seconds: int = 10
    candle_granularity: str = "ONE_MINUTE"


@dataclass
class AppConfig:
    coinbase: CoinbaseConfig = field(default_factory=CoinbaseConfig)
    risk: RiskConfig = field(default_factory=RiskConfig)
    trading: TradingConfig = field(default_factory=TradingConfig)
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "trading_bot.log")
