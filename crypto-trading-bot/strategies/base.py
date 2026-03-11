"""Base class for all trading strategies."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from data.market_data import MarketDataFetcher, MarketSnapshot
from quant.engine import QuantEngine


@dataclass
class Signal:
    product_id: str
    action: str  # "buy", "sell", "hold"
    confidence: float  # 0.0 to 1.0
    reason: str
    strategy: str
    suggested_stop_loss: float = 0.0
    suggested_take_profit: float = 0.0


class BaseStrategy(ABC):
    name: str = "base"

    @abstractmethod
    def evaluate(
        self, snapshot: MarketSnapshot, data: MarketDataFetcher,
        quant: QuantEngine | None = None,
    ) -> Signal | None:
        """Evaluate market conditions and return a signal, or None if no action."""
        ...
