"""Manages open positions and tracks P&L."""

import time
from dataclasses import dataclass, field
from exchange.coinbase_client import CoinbaseClient
from utils.logger import setup_logger

logger = setup_logger("order_manager")


@dataclass
class Position:
    product_id: str
    side: str  # "long"
    entry_price: float
    size: float  # base asset quantity
    usd_cost: float
    entry_time: float = field(default_factory=time.time)
    stop_loss_price: float = 0.0
    take_profit_price: float = 0.0
    trailing_stop_pct: float = 0.0
    highest_price: float = 0.0
    strategy: str = ""

    @property
    def age_seconds(self) -> float:
        return time.time() - self.entry_time


class OrderManager:
    def __init__(self, client: CoinbaseClient):
        self.client = client
        self.open_positions: dict[str, Position] = {}  # product_id -> Position
        self.closed_trades: list[dict] = []
        self.daily_pnl: float = 0.0
        self.daily_pnl_reset_time: float = time.time()

    def reset_daily_pnl_if_needed(self):
        """Reset daily P&L counter every 24 hours."""
        if time.time() - self.daily_pnl_reset_time > 86400:
            logger.info(f"Daily P&L reset. Previous day: ${self.daily_pnl:.2f}")
            self.daily_pnl = 0.0
            self.daily_pnl_reset_time = time.time()

    def has_position(self, product_id: str) -> bool:
        return product_id in self.open_positions

    def open_position(
        self,
        product_id: str,
        entry_price: float,
        usd_amount: float,
        stop_loss_price: float,
        take_profit_price: float,
        trailing_stop_pct: float = 0.0,
        strategy: str = "",
    ) -> Position | None:
        if self.has_position(product_id):
            logger.warning(f"Already have position in {product_id}, skipping")
            return None

        resp = self.client.market_buy(product_id, usd_amount)

        success = False
        if isinstance(resp, dict):
            success = resp.get("success", False)
        else:
            success = getattr(resp, "success", False)

        if not success:
            logger.error(f"Failed to open position: {resp}")
            return None

        size = usd_amount / entry_price  # approximate; real fill may differ

        pos = Position(
            product_id=product_id,
            side="long",
            entry_price=entry_price,
            size=size,
            usd_cost=usd_amount,
            stop_loss_price=stop_loss_price,
            take_profit_price=take_profit_price,
            trailing_stop_pct=trailing_stop_pct,
            highest_price=entry_price,
            strategy=strategy,
        )
        self.open_positions[product_id] = pos
        logger.info(
            f"OPENED {product_id} | entry=${entry_price:.2f} | "
            f"size={size:.8f} | SL=${stop_loss_price:.2f} | TP=${take_profit_price:.2f} | "
            f"strategy={strategy}"
        )
        return pos

    def close_position(self, product_id: str, current_price: float, reason: str = "") -> float:
        pos = self.open_positions.pop(product_id, None)
        if not pos:
            logger.warning(f"No open position for {product_id}")
            return 0.0

        resp = self.client.market_sell(product_id, pos.size)

        pnl = (current_price - pos.entry_price) * pos.size
        pnl_pct = ((current_price / pos.entry_price) - 1) * 100
        self.daily_pnl += pnl

        trade_record = {
            "product_id": product_id,
            "entry_price": pos.entry_price,
            "exit_price": current_price,
            "size": pos.size,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "hold_seconds": pos.age_seconds,
            "strategy": pos.strategy,
            "reason": reason,
            "timestamp": time.time(),
        }
        self.closed_trades.append(trade_record)

        emoji = "+" if pnl >= 0 else ""
        logger.info(
            f"CLOSED {product_id} | {emoji}${pnl:.2f} ({pnl_pct:+.2f}%) | "
            f"reason={reason} | held {pos.age_seconds:.0f}s | strategy={pos.strategy}"
        )
        return pnl

    def check_stop_losses(self, prices: dict[str, float]):
        """Check all positions for stop-loss / take-profit / trailing-stop triggers."""
        to_close: list[tuple[str, str]] = []

        for product_id, pos in self.open_positions.items():
            price = prices.get(product_id)
            if price is None:
                continue

            # Update highest price for trailing stop
            if price > pos.highest_price:
                pos.highest_price = price

            # Stop loss
            if pos.stop_loss_price > 0 and price <= pos.stop_loss_price:
                to_close.append((product_id, "stop_loss"))
                continue

            # Take profit
            if pos.take_profit_price > 0 and price >= pos.take_profit_price:
                to_close.append((product_id, "take_profit"))
                continue

            # Trailing stop
            if pos.trailing_stop_pct > 0:
                trail_price = pos.highest_price * (1 - pos.trailing_stop_pct / 100)
                if price <= trail_price:
                    to_close.append((product_id, "trailing_stop"))
                    continue

        for product_id, reason in to_close:
            self.close_position(product_id, prices[product_id], reason=reason)

    def get_total_invested(self) -> float:
        return sum(p.usd_cost for p in self.open_positions.values())

    def get_open_count(self) -> int:
        return len(self.open_positions)

    def get_win_rate(self) -> float:
        if not self.closed_trades:
            return 0.0
        wins = sum(1 for t in self.closed_trades if t["pnl"] > 0)
        return wins / len(self.closed_trades) * 100
