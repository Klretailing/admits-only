#!/usr/bin/env bash
#
# run.sh — Start the crypto trading bot as a background daemon.
#
# Usage:
#   ./run.sh start     Start the bot in the background
#   ./run.sh stop      Stop the bot
#   ./run.sh status    Check if the bot is running
#   ./run.sh logs      Tail the log file
#   ./run.sh restart   Restart the bot
#

set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$DIR/bot.pid"
LOGFILE="$DIR/trading_bot.log"
VENV="$DIR/venv"

start_bot() {
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
        echo "Bot is already running (PID $(cat "$PIDFILE"))"
        exit 1
    fi

    echo "Starting crypto trading bot..."

    # Create venv if needed
    if [ ! -d "$VENV" ]; then
        echo "Creating virtual environment..."
        python3 -m venv "$VENV"
        "$VENV/bin/pip" install --upgrade pip
        "$VENV/bin/pip" install -r "$DIR/requirements.txt"
    fi

    # Check for .env
    if [ ! -f "$DIR/.env" ]; then
        echo "ERROR: .env file not found."
        echo "Copy .env.example to .env and add your Coinbase API credentials."
        exit 1
    fi

    # Start in background
    nohup "$VENV/bin/python" "$DIR/main.py" >> "$LOGFILE" 2>&1 &
    echo $! > "$PIDFILE"
    echo "Bot started (PID $(cat "$PIDFILE"))"
    echo "Logs: tail -f $LOGFILE"
}

stop_bot() {
    if [ ! -f "$PIDFILE" ]; then
        echo "Bot is not running (no PID file)"
        exit 0
    fi

    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping bot (PID $PID)..."
        kill "$PID"
        sleep 2
        if kill -0 "$PID" 2>/dev/null; then
            echo "Force killing..."
            kill -9 "$PID"
        fi
        echo "Bot stopped."
    else
        echo "Bot process not found (stale PID file)."
    fi
    rm -f "$PIDFILE"
}

status_bot() {
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
        echo "Bot is running (PID $(cat "$PIDFILE"))"
    else
        echo "Bot is not running"
    fi
}

case "${1:-}" in
    start)
        start_bot
        ;;
    stop)
        stop_bot
        ;;
    status)
        status_bot
        ;;
    logs)
        tail -f "$LOGFILE"
        ;;
    restart)
        stop_bot
        start_bot
        ;;
    *)
        echo "Usage: $0 {start|stop|status|logs|restart}"
        exit 1
        ;;
esac
