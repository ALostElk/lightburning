#!/bin/bash
# 设置 Git hook，在提交时自动追踪变更的文件

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.claude/hooks"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    exit 1
fi

mkdir -p "$GIT_HOOKS_DIR"

# 创建 pre-commit hook
cat > "$GIT_HOOKS_DIR/pre-commit" <<'HOOK_EOF'
#!/bin/bash
# Git pre-commit hook - 自动追踪变更的文件

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$PROJECT_ROOT/.claude/hooks"
SESSION_ID="git-$(date +%s)"

# 获取暂存的文件
git diff --cached --name-only | while read file; do
    if [[ "$file" =~ \.(js|ts|wxml|wxss|json)$ ]] && [ -f "$PROJECT_ROOT/$file" ]; then
        echo "📝 追踪变更: $file"
        cat <<EOF | cd "$HOOKS_DIR" && CLAUDE_PROJECT_DIR="$PROJECT_ROOT" bash "$HOOKS_DIR/post-tool-use-tracker.sh"
{"tool_name":"Edit","tool_input":{"file_path":"$PROJECT_ROOT/$file"},"session_id":"$SESSION_ID"}
EOF
    fi
done

exit 0
HOOK_EOF

chmod +x "$GIT_HOOKS_DIR/pre-commit"

echo "✅ Git hook 已安装"
echo "📝 现在每次 git commit 时会自动追踪变更的文件"

