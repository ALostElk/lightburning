/**
 * BorderBeamButton 组件 - 旋转光束边框按钮
 *
 * 功能：
 * - 圆锥渐变旋转光束边框效果
 * - 加载状态时加速旋转
 * - 悬停时光束变亮
 * - 支持多种主题和尺寸
 *
 * 使用示例：
 * <border-beam-button
 *   text="AI 洞察"
 *   icon="✨"
 *   loading="{{isAnalyzing}}"
 *   bindtap="onAnalyze"
 * />
 */

Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 按钮文字
    text: {
      type: String,
      value: 'AI 洞察'
    },
    // 加载中文字
    loadingText: {
      type: String,
      value: '分析中...'
    },
    // 图标（emoji 或文字）
    icon: {
      type: String,
      value: '✨'
    },
    // 主题：primary | blue | green
    theme: {
      type: String,
      value: 'primary'
    },
    // 尺寸：sm | md | lg
    size: {
      type: String,
      value: 'md'
    },
    // 是否加载中
    loading: {
      type: Boolean,
      value: false
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否常亮（始终显示光束）
    alwaysOn: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTap() {
      if (this.data.disabled || this.data.loading) return;
      this.triggerEvent('tap');
    }
  }
});
