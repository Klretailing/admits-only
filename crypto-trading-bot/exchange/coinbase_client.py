"""Wrapper around the Coinbase Advanced Trade API."""

import uuid
from coinbase.rest import RESTClient
from utils.logger import setup_logger

logger = setup_logger("coinbase_client")


class CoinbaseClient:
    def __init__(self, api_key: str, api_secret: str):
        self.client = RESTClient(api_key=api_key, api_secret=api_secret)
        logger.info("Coinbase client initialized")

    # ── Account / Portfolio ──────────────────────────────────────────

    def get_accounts(self) -> list[dict]:
        resp = self.client.get_accounts()
        return resp["accounts"] if "accounts" in resp else resp.accounts

    def get_account_balance(self, currency: str) -> float:
        for acct in self.get_accounts():
            acct_currency = (
                acct.get("currency") or acct.currency
                if hasattr(acct, "currency")
                else acct["currency"]
            )
            if acct_currency == currency:
                bal = acct.get("available_balance", {})
                return float(bal.get("value", 0) if isinstance(bal, dict) else bal.value)
        return 0.0

    def get_usd_balance(self) -> float:
        return self.get_account_balance("USD")

    # ── Market Data ──────────────────────────────────────────────────

    def get_product(self, product_id: str) -> dict:
        return self.client.get_product(product_id)

    def get_candles(self, product_id: str, start: str, end: str, granularity: str = "ONE_MINUTE") -> list:
        resp = self.client.get_candles(
            product_id=product_id, start=start, end=end, granularity=granularity
        )
        return resp["candles"] if "candles" in resp else resp.candles

    def get_best_bid_ask(self, product_ids: list[str]) -> dict:
        resp = self.client.get_best_bid_ask(product_ids=product_ids)
        return resp

    def get_ticker(self, product_id: str) -> dict:
        """Get current price via product endpoint."""
        product = self.get_product(product_id)
        return product

    # ── Orders ───────────────────────────────────────────────────────

    def market_buy(self, product_id: str, usd_amount: float) -> dict:
        order_id = str(uuid.uuid4())
        logger.info(f"MARKET BUY  | {product_id} | ${usd_amount:.2f} | order={order_id}")
        resp = self.client.market_order_buy(
            client_order_id=order_id,
            product_id=product_id,
            quote_size=str(round(usd_amount, 2)),
        )
        return resp

    def market_sell(self, product_id: str, base_size: float) -> dict:
        order_id = str(uuid.uuid4())
        logger.info(f"MARKET SELL | {product_id} | size={base_size} | order={order_id}")
        resp = self.client.market_order_sell(
            client_order_id=order_id,
            product_id=product_id,
            base_size=str(base_size),
        )
        return resp

    def limit_buy(self, product_id: str, base_size: float, limit_price: float) -> dict:
        order_id = str(uuid.uuid4())
        logger.info(
            f"LIMIT BUY   | {product_id} | size={base_size} @ ${limit_price:.2f} | order={order_id}"
        )
        resp = self.client.limit_order_gtc_buy(
            client_order_id=order_id,
            product_id=product_id,
            base_size=str(base_size),
            limit_price=str(round(limit_price, 2)),
        )
        return resp

    def limit_sell(self, product_id: str, base_size: float, limit_price: float) -> dict:
        order_id = str(uuid.uuid4())
        logger.info(
            f"LIMIT SELL  | {product_id} | size={base_size} @ ${limit_price:.2f} | order={order_id}"
        )
        resp = self.client.limit_order_gtc_sell(
            client_order_id=order_id,
            product_id=product_id,
            base_size=str(base_size),
            limit_price=str(round(limit_price, 2)),
        )
        return resp

    def cancel_orders(self, order_ids: list[str]) -> dict:
        logger.info(f"CANCEL      | orders={order_ids}")
        return self.client.cancel_orders(order_ids=order_ids)

    def list_orders(self, product_id: str | None = None, status: str = "OPEN") -> list:
        kwargs = {"order_status": [status]}
        if product_id:
            kwargs["product_id"] = product_id
        resp = self.client.list_orders(**kwargs)
        return resp.get("orders", []) if isinstance(resp, dict) else resp.orders

    def get_order(self, order_id: str) -> dict:
        return self.client.get_order(order_id)
