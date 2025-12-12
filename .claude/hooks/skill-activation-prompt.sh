#!/bin/bash
set -e

# 获取脚本所在目录（更可靠的方式）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"
cat | npx tsx skill-activation-prompt.ts
