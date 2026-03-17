#!/bin/bash

# Configuration
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PATH="$ROOT/client"
SERVER_PATH="$ROOT/server"

# Function to check if a command exists
assert_command_exists() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "\033[0;31mError: Required command '$1' was not found in PATH.\033[0m"
    exit 1
  fi
}

# Function to start a dev process
start_dev_process() {
  local name=$1
  local wd=$2
  local cmd=$3
  local background=$4

  echo -e "\033[0;36mStarting $name in $wd\033[0m"

  if [ "$background" = true ]; then
    # Redirect output to a log file to keep the terminal clean
    mkdir -p "$ROOT/logs"
    (cd "$wd" && $cmd > "$ROOT/logs/$name.log" 2>&1) &
    echo -e "\033[0;32m$name started in background (Log: logs/$name.log)\033[0m"
  else
    (cd "$wd" && $cmd)
  fi
}

# Check dependencies
assert_command_exists "npm"

# Check directories
if [ ! -d "$CLIENT_PATH" ]; then
  echo -e "\033[0;31mError: Client folder not found at $CLIENT_PATH\033[0m"
  exit 1
fi

if [ ! -d "$SERVER_PATH" ]; then
  echo -e "\033[0;31mError: Server folder not found at $SERVER_PATH\033[0m"
  exit 1
fi

# Parse arguments
BACKGROUND=false
for arg in "$@"; do
  if [ "$arg" == "--background" ] || [ "$arg" == "-b" ]; then
    BACKGROUND=true
  fi
done

# Start processes
start_dev_process "gestionale-client" "$CLIENT_PATH" "npm run dev" "$BACKGROUND"
start_dev_process "gestionale-server" "$SERVER_PATH" "npm run dev" "$BACKGROUND"

if [ "$BACKGROUND" = true ]; then
  echo -e "\033[0;32mFrontend and backend started in background.\033[0m"
  echo -e "\033[0;33mUse 'jobs' to see running background tasks or 'tail -f logs/*.log' to see output.\033[0m"
fi
