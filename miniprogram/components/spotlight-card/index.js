/**
 * SpotlightCard 组件 - 聚光灯跟踪卡片
 *
 * 修复版本：使用简单 JS 触摸处理，确保内部元素可点击
 * 移除了 WXS 以避免事件拦截问题
 */

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
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
    // 是否显示边框
    bordered: {
      type: Boolean,
      value: true
    },
    // 是否实心背景（无毛玻璃效果）
    solid: {
      type: Boolean,
      value: false
    },
    // 是否显示阴影
    shadow: {
      type: Boolean,
      value: true
    },
    // 是否使用全息阴影效果
    holo: {
      type: Boolean,
      value: false
    },
    // 是否启用 Prism Border 效果（已简化）
    prism: {
      type: Boolean,
      value: false
    },
    // 自定义类名
    customClass: {
      type: String,
      value: ''
    },
    // 自定义样式
    customStyle: {
      type: String,
      value: ''
    }
  },

  data: {
    // 按压状态
    isPressed: false,
    // 计算后的类名
    computedClass: ''
  },

  lifetimes: {
    attached() {
      this.updateComputedClass();
    }
  },

  methods: {
    // 触摸开始 - 添加按压效果
    onTouchStart(e) {
      this.setData({ isPressed: true });
    },

    // 触摸结束 - 移除按压效果
    onTouchEnd(e) {
      this.setData({ isPressed: false });
    },

    // 点击事件 - 触发外部绑定的 tap 事件
    onTap(e) {
      this.triggerEvent('tap', e.detail);
    },

    // 计算自定义类名
    updateComputedClass() {
      const { theme, size, bordered, solid, shadow, holo, customClass } = this.data;

      let classes = [];

      // 主题
      if (theme) {
        classes.push(`theme-${theme}`);
      }

      // 尺寸
      if (size && size !== 'md') {
        classes.push(`size-${size}`);
      }

      // 边框
      if (!bordered) {
        classes.push('no-border');
      }

      // 实心背景
      if (solid) {
        classes.push('solid');
      }

      // 阴影
      if (!shadow) {
        classes.push('flat');
      }

      // 全息效果
      if (holo) {
        classes.push('holo');
      }

      // 自定义类名
      if (customClass) {
        classes.push(customClass);
      }

      this.setData({
        computedClass: classes.join(' ')
      });
    }
  },

  observers: {
    // 监听属性变化，更新类名
    'theme, size, bordered, solid, shadow, holo, customClass': function() {
      this.updateComputedClass();
    }
  }
});
