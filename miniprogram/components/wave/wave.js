/**
 * 波浪组件 - Wave Component
 * 设计语言: Daylight Futurism (日光未来主义)
 * 功能: Canvas 绘制芦荟/薄荷质感渐变波浪
 */

Component({
  properties: {
    // 波浪高度百分比 (0-100)
    progress: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        this.drawWave();
      }
    },
    // Canvas 宽度
    width: {
      type: Number,
      value: 280
    },
    // Canvas 高度
    height: {
      type: Number,
      value: 280
    }
  },

  data: {
    // 波浪动画相关
    waveOffset: 0,
    animationId: null
  },

  lifetimes: {
    attached() {
      this.drawWave();
      this.startWaveAnimation();
    },
    detached() {
      this.stopWaveAnimation();
    }
  },

  methods: {
    /**
     * 绘制波浪
     */
    drawWave() {
      const query = this.createSelectorQuery();
      query.select('#wave-canvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            // 降级到旧版 Canvas API
            this.drawWaveLegacy();
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          const width = res[0].width;
          const height = res[0].height;

          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          this.drawWaveOnCanvas(ctx, width, height);
        });
    },

    /**
     * 降级方案：使用旧版 Canvas API
     */
    drawWaveLegacy() {
      const ctx = wx.createCanvasContext('wave-canvas', this);
      const width = this.properties.width;
      const height = this.properties.height;
      
      // 清空画布
      ctx.clearRect(0, 0, width, height);
      
      // 计算液体高度
      const progress = Math.max(0, Math.min(100, this.properties.progress));
      const liquidHeight = (height * progress) / 100;
      
      if (liquidHeight <= 0) {
        ctx.draw();
        return;
      }

      // 绘制后波浪（背景层）
      this.drawSingleWave(ctx, width, height, liquidHeight, false);
      
      // 绘制前波浪（前景层）
      this.drawSingleWave(ctx, width, height, liquidHeight, true);
      
      ctx.draw();
    },

    /**
     * 在新版 Canvas 上绘制
     */
    drawWaveOnCanvas(ctx, width, height) {
      const progress = Math.max(0, Math.min(100, this.properties.progress));
      const liquidHeight = (height * progress) / 100;
      
      if (liquidHeight <= 0) {
        return;
      }

      // 清空画布
      ctx.clearRect(0, 0, width, height);

      // 绘制后波浪（背景层）
      this.drawSingleWave(ctx, width, height, liquidHeight, false);
      
      // 绘制前波浪（前景层）
      this.drawSingleWave(ctx, width, height, liquidHeight, true);
    },

    /**
     * 绘制单个波浪
     * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
     * @param {Number} canvasWidth - 画布宽度
     * @param {Number} canvasHeight - 画布高度
     * @param {Number} liquidHeight - 液体高度
     * @param {Boolean} isFront - 是否为前波浪
     */
    drawSingleWave(ctx, canvasWidth, canvasHeight, liquidHeight, isFront) {
      const waveOffset = this.data.waveOffset || 0;
      const waveLength = canvasWidth / 2; // 波浪波长
      const waveAmplitude = 15; // 波浪振幅
      const baseY = canvasHeight - liquidHeight; // 波浪基线Y坐标

      ctx.beginPath();
      
      // 从左侧开始绘制波浪路径
      ctx.moveTo(0, baseY);
      
      // 绘制波浪曲线
      for (let x = 0; x <= canvasWidth; x += 2) {
        const y = baseY + waveAmplitude * Math.sin((x / waveLength) * Math.PI * 2 + waveOffset);
        ctx.lineTo(x, y);
      }
      
      // 闭合路径：右下角 -> 左下角 -> 起点
      ctx.lineTo(canvasWidth, canvasHeight);
      ctx.lineTo(0, canvasHeight);
      ctx.closePath();

      // 创建线性渐变 (从上到下)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);

      // 根据前后波浪设置不同的渐变色 - 芦荟/薄荷质感
      if (isFront) {
        // 前波浪：清新的薄荷绿 -> 嫩草绿
        // 顶部: 薄荷绿
        gradient.addColorStop(0, 'rgba(110, 231, 183, 0.85)'); 
        // 底部: 极淡的薄荷绿
        gradient.addColorStop(1, 'rgba(209, 250, 229, 0.6)'); 
        ctx.fillStyle = gradient;
      } else {
        // 后波浪：更淡的薄荷绿，作为层次衬托
        gradient.addColorStop(0, 'rgba(110, 231, 183, 0.3)');
        gradient.addColorStop(1, 'rgba(236, 253, 245, 0.1)');
        ctx.fillStyle = gradient;
      }

      ctx.fill();
    },

    /**
     * 开始波浪动画
     */
    startWaveAnimation() {
      const animate = () => {
        this.setData({
          waveOffset: (this.data.waveOffset || 0) + 0.1
        });
        this.drawWave();
        this.data.animationId = requestAnimationFrame(animate);
      };
      this.data.animationId = requestAnimationFrame(animate);
    },

    /**
     * 停止波浪动画
     */
    stopWaveAnimation() {
      if (this.data.animationId) {
        cancelAnimationFrame(this.data.animationId);
        this.data.animationId = null;
      }
    }
  }
});

