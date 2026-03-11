"""Risk management: position sizing, loss limits, and trade gating."""

import time
from config import RiskConfig
from exchange.order_manager import OrderManager
from utils.logger import setup_logger

logger = setup_logger("risk_manager")


class RiskManager:
    def __init__(self, config: RiskConfig, order_manager: OrderManager):
        self.config = config
        self.om = order_manager
        self.last_loss_time: float = 0.0
        self.starting_balance: float | None = None

    def set_starting_balance(self, balance: float):
        self.starting_balance = balance
        logger.info(f"Starting balance set: ${balance:.2f}")

    def can_trade(self, usd_balance: float) -> tuple[bool, str]:
        """Check whether we are allowed to take a new trade."""
        # Max open positions
        if self.om.get_open_count() >= self.config.max_open_positions:
            return False, f"Max open positions ({self.config.max_open_positions}) reached"

        # Daily loss limit
        max_daily_loss = usd_balance * (self.config.max_daily_loss_percent / 100)
        if self.om.daily_pnl < -max_daily_loss:
            return False, f"Daily loss limit hit: ${self.om.daily_pnl:.2f}"

        # Max drawdown from starting balance
        if self.starting_balance is not None:
            total_value = usd_balance + self.om.get_total_invested()
            drawdown = ((self.starting_balance - total_value) / self.starting_balance) * 100
            if drawdown > self.config.max_drawdown_percent:
                return False, f"Max drawdown ({drawdown:.1f}%) exceeded limit ({self.config.max_drawdown_percent}%)"

        # Cooldown after loss
        if self.last_loss_time > 0:
            elapsed = time.time() - self.last_loss_time
            if elapsed < self.config.cooldown_after_loss_seconds:
                remaining = self.config.cooldown_after_loss_seconds - elapsed
                return False, f"Cooldown after loss: {remaining:.0f}s remaining"

        return True, "OK"

    def compute_position_size(self, usd_balance: float) -> float:
        """How much USD to risk on a single trade."""
        return usd_balance * (self.config.max_portfolio_percent_per_trade / 100)

    def compute_stop_loss(self, entry_price: float, atr: float | None = None) -> float:
        """Compute stop-loss price. Uses ATR if available, else fixed percent."""
        if atr and atr > 0:
            return entry_price - (1.5 * atr)
        return entry_price * (1 - self.config.trailing_stop_percent / 100)

    def compute_take_profit(self, entry_price: float, atr: float | None = None) -> float:
        """Compute take-profit target."""
        if atr and atr > 0:
            return entry_price + (2.0 * atr)
        return entry_price * (1 + self.config.min_profit_target_percent / 100)

    def record_loss(self):
        self.last_loss_time = time.time()
        logger.info("Loss recorded — cooldown activated")

    def log_status(self, usd_balance: float):
        total_invested = self.om.get_total_invested()
        total_value = usd_balance + total_invested
        drawdown = 0.0
        if self.starting_balance and self.starting_balance > 0:
            drawdown = ((self.starting_balance - total_value) / self.starting_balance) * 100

        logger.info(
            f"RISK STATUS | balance=${usd_balance:.2f} | invested=${total_invested:.2f} | "
            f"daily_pnl=${self.om.daily_pnl:.2f} | drawdown={drawdown:.2f}% | "
            f"open={self.om.get_open_count()} | win_rate={self.om.get_win_rate():.1f}%"
        )
