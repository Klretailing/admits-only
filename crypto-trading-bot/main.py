#!/usr/bin/env python3
"""
Crypto Trading Bot — Main daemon loop.

Continuously scans configured trading pairs, runs multi-timeframe quant
analysis, evaluates strategies, executes trades, and manages risk.
Designed to run 24/7 unattended.

Architecture:
  1. Fetch real-time snapshots for all configured pairs
  2. Run quant engine analysis (indicators, patterns, statistics)
  3. Run multi-timeframe confluence check
  4. Evaluate all strategies with quant context
  5. Execute highest-confidence trade (if any passes risk gates)
  6. Manage open positions (trailing stops, take-profits)
  7. Sleep, repeat
"""

import sys
import os
import signal
import time
import traceback

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import AppConfig
from exchange.coinbase_client import CoinbaseClient
from exchange.order_manager import OrderManager
from data.market_data import MarketDataFetcher
from risk.manager import RiskManager
from quant.engine import QuantEngine
from quant.multi_timeframe import MultiTimeframeEngine
from quant.statistics import kelly_criterion
from strategies.scalper import ScalpingStrategy
from strategies.momentum import MomentumStrategy
from strategies.mean_reversion import MeanReversionStrategy
from strategies.base import BaseStrategy, Signal
from utils.logger import setup_logger


class TradingBot:
    def __init__(self, config: AppConfig):
        self.config = config
        self.logger = setup_logger("bot", config.log_file, config.log_level)
        self.running = False

        # Initialize components
        self.client = CoinbaseClient(config.coinbase.api_key, config.coinbase.api_secret)
        self.order_manager = OrderManager(self.client)
        self.market_data = MarketDataFetcher(self.client, config.trading.pairs)
        self.risk_manager = RiskManager(config.risk, self.order_manager)

        # Quant engine
        self.quant = QuantEngine()
        self.mtf = MultiTimeframeEngine(self.quant, self.market_data)

        # Initialize strategies
        self.strategies: list[BaseStrategy] = []
        if config.trading.enable_scalper:
            self.strategies.append(ScalpingStrategy())
        if config.trading.enable_momentum:
            self.strategies.append(MomentumStrategy())
        if config.trading.enable_mean_reversion:
            self.strategies.append(MeanReversionStrategy())

        self.logger.info(
            f"Bot initialized | pairs={config.trading.pairs} | "
            f"strategies={[s.name for s in self.strategies]} | "
            f"quant_engine=enabled | multi_timeframe=enabled"
        )

    def start(self):
        """Main entry point — starts the continuous trading loop."""
        self.running = True
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

        self.logger.info("=" * 60)
        self.logger.info("TRADING BOT STARTING — QUANT ENGINE v2")
        self.logger.info("=" * 60)

        # Record starting balance
        try:
            usd_balance = self.client.get_usd_balance()
            self.risk_manager.set_starting_balance(usd_balance)
            self.logger.info(f"USD Balance: ${usd_balance:.2f}")
        except Exception as e:
            self.logger.error(f"Failed to fetch initial balance: {e}")
            self.logger.error("Check your API key and secret in .env")
            return

        if usd_balance <= 0:
            self.logger.error("No USD balance available. Fund your Coinbase account first.")
            return

        # Main loop
        cycle = 0
        while self.running:
            cycle += 1
            try:
                self._run_cycle(cycle)
            except KeyboardInterrupt:
                break
            except Exception as e:
                self.logger.error(f"Cycle {cycle} error: {e}")
                self.logger.debug(traceback.format_exc())

            time.sleep(self.config.trading.scan_interval_seconds)

        self._cleanup()

    def _run_cycle(self, cycle: int):
        """Single scan-analyze-evaluate-execute cycle."""
        # Reset daily P&L if needed
        self.order_manager.reset_daily_pnl_if_needed()

        # Fetch market data
        snapshots = self.market_data.fetch_snapshots()
        if not snapshots:
            return

        # Check stop losses on existing positions
        prices = {pid: s.price for pid, s in snapshots.items()}
        self.order_manager.check_stop_losses(prices)

        # Get current balance
        usd_balance = self.client.get_usd_balance()

        # Log status every 30 cycles (~5 min at 10s intervals)
        if cycle % 30 == 0:
            self.risk_manager.log_status(usd_balance)
            self._log_market_summary(snapshots)

        # Check if we can trade
        can_trade, reason = self.risk_manager.can_trade(usd_balance)
        if not can_trade:
            if cycle % 30 == 0:
                self.logger.info(f"Trading paused: {reason}")
            return

        # Get win/loss stats for Kelly sizing
        win_rate = self.order_manager.get_win_rate() / 100
        avg_win = self.order_manager.get_avg_win()
        avg_loss = self.order_manager.get_avg_loss()

        # Evaluate strategies for each pair
        best_signal: Signal | None = None
        best_confluence_strength: float = 0.0

        for pair, snapshot in snapshots.items():
            # Skip if we already have a position
            if self.order_manager.has_position(pair):
                continue

            # Run multi-timeframe confluence analysis
            bid_depth = snapshot.bid_depth if hasattr(snapshot, "bid_depth") else 0
            ask_depth = snapshot.ask_depth if hasattr(snapshot, "ask_depth") else 0
            confluence = self.mtf.evaluate(
                pair, bid_depth=bid_depth, ask_depth=ask_depth,
                win_rate=max(win_rate, 0.5), avg_win=max(avg_win, 1.0),
                avg_loss=max(avg_loss, 1.0),
            )

            # Skip if multi-timeframe says neutral or bearish
            if confluence.direction != "buy" or confluence.strength < 0.3:
                continue

            # Now run individual strategies with quant context
            for strategy in self.strategies:
                try:
                    sig = strategy.evaluate(snapshot, self.market_data, quant=self.quant)
                    if sig and sig.action == "buy":
                        # Boost confidence with MTF confluence
                        boosted_confidence = sig.confidence * (0.7 + 0.3 * confluence.strength)

                        # Only take the best signal
                        if boosted_confidence > (best_signal.confidence if best_signal else 0):
                            sig.confidence = min(boosted_confidence, 1.0)
                            sig.reason += f" | MTF={confluence.strength:.2f} ({confluence.timeframes_aligned}TF)"
                            best_signal = sig
                            best_confluence_strength = confluence.strength
                except Exception as e:
                    self.logger.error(f"Strategy {strategy.name} error on {pair}: {e}")

        # Execute the highest-confidence signal
        if best_signal and best_signal.confidence >= 0.5:
            self._execute_signal(best_signal, usd_balance, win_rate, avg_win, avg_loss)

    def _execute_signal(self, signal: Signal, usd_balance: float,
                        win_rate: float, avg_win: float, avg_loss: float):
        """Execute a trade based on a strategy signal with Kelly-optimal sizing."""
        # Compute position size: min of risk-based and Kelly-based
        risk_size = self.risk_manager.compute_position_size(usd_balance)
        kelly_frac = kelly_criterion(max(win_rate, 0.5), max(avg_win, 1.0), max(avg_loss, 1.0))
        kelly_size = usd_balance * kelly_frac if kelly_frac > 0 else risk_size

        position_size = min(risk_size, kelly_size) if kelly_size > 0 else risk_size

        # Ensure minimum trade size ($1 on Coinbase)
        if position_size < 1.0:
            self.logger.warning(f"Position size too small: ${position_size:.2f}")
            return

        self.logger.info(
            f"EXECUTING | {signal.product_id} | {signal.strategy} | "
            f"confidence={signal.confidence:.2f} | size=${position_size:.2f} | "
            f"kelly={kelly_frac:.3f} | {signal.reason}"
        )

        snapshot = self.market_data.price_history.get(signal.product_id, [])
        current_price = snapshot[-1] if snapshot else 0.0
        if current_price <= 0:
            return

        stop_loss = signal.suggested_stop_loss or self.risk_manager.compute_stop_loss(current_price)
        take_profit = signal.suggested_take_profit or self.risk_manager.compute_take_profit(current_price)

        pos = self.order_manager.open_position(
            product_id=signal.product_id,
            entry_price=current_price,
            usd_amount=position_size,
            stop_loss_price=stop_loss,
            take_profit_price=take_profit,
            trailing_stop_pct=self.config.risk.trailing_stop_percent,
            strategy=signal.strategy,
        )

        if pos is None:
            self.logger.warning(f"Failed to open position for {signal.product_id}")

    def _log_market_summary(self, snapshots: dict):
        self.logger.info("─── MARKET SUMMARY ───")
        for pid, snap in snapshots.items():
            assessment = self.quant.get_assessment(f"{pid}_scalp")
            regime = assessment.regime if assessment else "?"
            hurst = f"{assessment.hurst:.2f}" if assessment else "?"
            buy = f"{assessment.buy_score:.2f}" if assessment else "?"
            sell = f"{assessment.sell_score:.2f}" if assessment else "?"
            self.logger.info(
                f"  {pid}: ${snap.price:.2f} | 24h={snap.price_change_24h_pct:+.1f}% | "
                f"spread={snap.spread_pct:.3f}% | regime={regime} (H={hurst}) | "
                f"buy={buy} sell={sell}"
            )

    def _shutdown(self, signum, frame):
        self.logger.info("Shutdown signal received...")
        self.running = False

    def _cleanup(self):
        """Log final stats on shutdown."""
        self.logger.info("=" * 60)
        self.logger.info("TRADING BOT SHUTTING DOWN")
        self.logger.info(f"Total trades: {len(self.order_manager.closed_trades)}")
        self.logger.info(f"Win rate: {self.order_manager.get_win_rate():.1f}%")
        self.logger.info(f"Daily P&L: ${self.order_manager.daily_pnl:.2f}")
        self.logger.info(f"Open positions: {self.order_manager.get_open_count()}")

        if self.order_manager.open_positions:
            self.logger.warning(
                "WARNING: Open positions remain. They will NOT be automatically closed."
            )
            for pid, pos in self.order_manager.open_positions.items():
                self.logger.warning(f"  {pid}: size={pos.size} entry=${pos.entry_price:.2f}")

        self.logger.info("=" * 60)


def main():
    config = AppConfig()

    if not config.coinbase.api_key or not config.coinbase.api_secret:
        print("ERROR: Set COINBASE_API_KEY and COINBASE_API_SECRET in .env")
        print("Generate API keys at: https://www.coinbase.com/settings/api")
        sys.exit(1)

    bot = TradingBot(config)
    bot.start()


if __name__ == "__main__":
    main()
