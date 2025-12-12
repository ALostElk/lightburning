/**
 * FloatingFab 组件 - 浮动操作按钮
 *
 * 功能：
 * - 浮动悬浮动画 (levitate)
 * - 玻璃态背景 (Glassmorphism)
 * - 外层发光环
 * - 支持自定义图标和标签
 *
 * 使用示例：
 * <floating-fab
 *   icon="📷"
 *   label="拍照识别"
 *   position="bottom-center"
 *   theme="glass"
 *   bindtap="onCameraTap"
 * />
 */

Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 图标（emoji 或文字）
    icon: {
      type: String,
      value: '📷'
    },
    // 标签文字（可选）
    label: {
      type: String,
      value: ''
    },
    // 位置：bottom-center | bottom-right | bottom-left
    position: {
      type: String,
      value: 'bottom-center'
    },
    // 尺寸：sm | md | lg
    size: {
      type: String,
      value: 'md'
    },
    // 主题：glass | solid | blue | dark
    theme: {
      type: String,
      value: 'glass'
    },
    // 是否显示脉动效果
    pulse: {
      type: Boolean,
      value: false
    },
    // 是否适配安全区域
    safeArea: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('tap');
    }
  }
});
