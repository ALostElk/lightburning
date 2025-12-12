/**
 * GlowButton 组件 - 全息发光按钮
 *
 * 功能：
 * - 橙色渐变背景 + 全息纹理
 * - 触摸跟踪白色光泽效果
 * - 按压缩放动画
 * - 加载状态支持
 *
 * 使用示例：
 * <glow-button
 *   title="开启每日挑战"
 *   subtitle="赢取 50 积分"
 *   theme="primary"
 *   bindtap="onStartChallenge"
 * />
 */

Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 主标题
    title: {
      type: String,
      value: '点击开始'
    },
    // 副标题
    subtitle: {
      type: String,
      value: ''
    },
    // 主题：primary | blue | green | dark
    theme: {
      type: String,
      value: 'primary'
    },
    // 尺寸：sm | md
    size: {
      type: String,
      value: 'md'
    },
    // 是否显示图标
    showIcon: {
      type: Boolean,
      value: true
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否加载中
    loading: {
      type: Boolean,
      value: false
    }
  },

  data: {
    glowX: 0,
    glowY: 0,
    buttonRect: null
  },

  lifetimes: {
    attached() {
      this.updateButtonRect();
    }
  },

  methods: {
    // 更新按钮位置信息
    updateButtonRect() {
      const query = this.createSelectorQuery();
      query.select('.glow-button').boundingClientRect((rect) => {
        if (rect) {
          this.setData({ buttonRect: rect });
        }
      }).exec();
    },

    // 触摸移动 - 更新光泽位置
    onTouchMove(e) {
      if (this.data.disabled || this.data.loading) return;
      if (!e.touches || !e.touches.length) return;

      const touch = e.touches[0];

      if (!this.data.buttonRect) {
        this.updateButtonRect();
        return;
      }

      const x = touch.clientX - this.data.buttonRect.left;
      const y = touch.clientY - this.data.buttonRect.top;

      this.setData({
        glowX: x,
        glowY: y
      });
    },

    // 触摸结束
    onTouchEnd() {
      // 可以在这里添加触摸结束后的逻辑
    },

    // 点击事件
    onTap() {
      if (this.data.disabled || this.data.loading) return;
      this.triggerEvent('tap');
    }
  }
});
