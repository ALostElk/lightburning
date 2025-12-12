#!/bin/bash
# 自动追踪文件变更的脚本
# 使用方法：在 Cursor 终端运行：./.claude/hooks/auto-track.sh

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SESSION_ID="cursor-$(date +%s)"

echo "🔍 开始监听文件变更..."
echo "项目目录: $PROJECT_ROOT"
echo "会话ID: $SESSION_ID"
echo "按 Ctrl+C 停止监听"
echo ""

# 使用 fswatch (macOS) 或 inotifywait (Linux) 监听文件变更
if command -v fswatch &> /dev/null; then
    # macOS
    fswatch -o "$PROJECT_ROOT/miniprogram" "$PROJECT_ROOT/cloudfunctions" | while read num; do
        # 获取最近修改的文件
        find "$PROJECT_ROOT/miniprogram" "$PROJECT_ROOT/cloudfunctions" -type f -newer "$PROJECT_ROOT/.claude/.last-track" 2>/dev/null | while read file; do
            if [[ "$file" =~ \.(js|ts|wxml|wxss|json)$ ]]; then
                echo "📝 检测到变更: $file"
                cat <<EOF | cd "$PROJECT_ROOT/.claude/hooks" && CLAUDE_PROJECT_DIR="$PROJECT_ROOT" ./post-tool-use-tracker.sh
{"tool_name":"Edit","tool_input":{"file_path":"$file"},"session_id":"$SESSION_ID"}
EOF
            fi
        done
        touch "$PROJECT_ROOT/.claude/.last-track"
    done
elif command -v inotifywait &> /dev/null; then
    # Linux
    inotifywait -m -r -e modify,create,delete "$PROJECT_ROOT/miniprogram" "$PROJECT_ROOT/cloudfunctions" | while read path action file; do
        full_path="$path$file"
        if [[ "$full_path" =~ \.(js|ts|wxml|wxss|json)$ ]]; then
            echo "📝 检测到变更: $full_path"
            cat <<EOF | cd "$PROJECT_ROOT/.claude/hooks" && CLAUDE_PROJECT_DIR="$PROJECT_ROOT" ./post-tool-use-tracker.sh
{"tool_name":"Edit","tool_input":{"file_path":"$full_path"},"session_id":"$SESSION_ID"}
EOF
        fi
    done
else
    echo "❌ 错误: 未找到 fswatch (macOS) 或 inotifywait (Linux)"
    echo "请安装: brew install fswatch (macOS) 或 apt-get install inotify-tools (Linux)"
    exit 1
fi

