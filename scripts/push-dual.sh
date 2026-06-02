#!/bin/bash
# Dual-push script for Gitea and GitHub
# Usage: ./scripts/push-dual.sh [branch|tag]

set -e

TARGET="${1:-master}"

echo "🚀 推送到 Gitea..."
git push origin "$TARGET"

echo "🚀 推送到 GitHub..."
git push github "$TARGET"

echo "✅ 双平台推送完成: $TARGET"
