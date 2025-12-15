/**
 * 沉浸式运动计时页面
 * 设计语言: Daylight Futurism - Kinetic Aqua
 */

Page({
  data: {
    statusBarHeight: 44,
    exerciseName: '',
    exerciseEmoji: '',
    caloriesPerMin: 0,
    seconds: 0,
    isPaused: false,
    currentCalories: 0,
    formattedTime: '00:00:00',
    timerInterval: null,

    // AI 模式相关
    isAIMode: false,
    canUseAI: true, // 默认显示按钮，点击时再检测实际支持情况
    supportAI: true, // 当前运动是否支持 AI 检测
    aiCount: 0,
    guideText: '',
    isDetecting: false,

    // AI 运动类型（用于决定检测哪种动作）
    aiExerciseType: 'squat', // squat, pushup, jumping_jack, plank, etc.
    aiCaloriesPerRep: 0.5, // 每次动作消耗的热量

    // 姿势保持类运动的计时
    poseHoldTime: 0, // 姿势保持秒数
    isPoseHeld: false, // 是否正在保持姿势

    // AI 指导计量方式（计次 / 计时）
    aiMetricMode: 'reps', // reps | hold
    aiMetricValue: 0,
    aiMetricUnit: '次',
    isTimeBasedMetric: false,

    // 调试 HUD
    debugEnabled: false,
    debugText: '',
    debugLines: [],

    // VisionKit 摄像头（用于排查部分 Android 前摄不出骨骼的问题）
    vkCameraPosition: 'front', // front/back

    // 运动分类（用于运动记录归类）
    exerciseCategory: 'aerobic', // aerobic | strength | flexibility | sports

    // 端侧 MVP（简化模式：节拍器 + 动作要点 + 手动计数）
    isFallbackMode: false,
    mvpExpanded: false,
    metronomeEnabled: true,
    metronomeBpm: 45,
    metronomeBeat: 0,
    metronomeFlash: false,
    tipText: '',
    cadenceRpm: 0, // 当前节奏（手动或节拍估算）
    targetCadenceRpm: 0, // 目标节奏（由 BPM / beatsPerRep 推导）
    autoCountEnabled: false,
    beatsPerRep: 2,
    beatsInRep: 0,
    phaseText: '' // 下/上/保持
  },

  onLoad(options) {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 44
    });

    const name = decodeURIComponent(options.name || '');
    const emoji = decodeURIComponent(options.emoji || '');
    const cal = parseFloat(options.cal || 0);
    const exerciseCategoryFromRoute = decodeURIComponent(options.type || '');

    // 根据运动名称自动判断 AI 检测类型
    const aiType = this.detectAIExerciseType(name);
    const exerciseCategory = this.normalizeExerciseCategory(exerciseCategoryFromRoute) ||
      this.detectExerciseCategory(name, aiType.type);

    this.setData({
      exerciseName: name,
      exerciseEmoji: emoji,
      caloriesPerMin: cal,
      aiExerciseType: aiType.type,
      aiCaloriesPerRep: aiType.caloriesPerRep,
      supportAI: aiType.supportAI,
      exerciseCategory
    });

    this.applyAIMetricMode(aiType.type);

    // 初始化 AI 相关状态变量
    this.cameraReady = false;
    this.vkInitPending = false;
    this.fallbackMode = false;
    this.vkFrameId = null;
    this.loopTimerId = null;
    this.loopErrorLogged = false;
    this.hasBodyEverDetected = false;
    this.lastBodySeenAt = 0;
    this.didReceiveAnchors = false;
    this.didReceiveFrames = false;
    this.debugLastUpdateAt = 0;
    this.debugFps = 0;
    this.debugLastLoopCostMs = 0;
    this.debugLastFrameShape = '';
    this.debugLastKeypoints = 0;
    this.debugLastConfident = 0;
    this.debugLastError = '';
    this.debugLastBodies = 0;
    this.noBodyFrames = 0;
    this.totalLoopFrames = 0;
    this._fpsCount = 0;
    this._fpsLastTs = 0;

    // MVP 节拍器/提示
    this.metronomeTimerId = null;
    this.metronomeNextAt = 0;
    this.cadenceSamples = [];
    this.tipTimerId = null;
    this._metronomeBeat = 0;
    this._beatsInRep = 0;

    this.startTimer();

    if (wx.enableAlertBeforeUnload) {
      wx.enableAlertBeforeUnload({
        message: '运动正在进行中，确定要退出吗？',
      });
    }

    // 检测 AI 支持
    setTimeout(() => {
      this.checkAISupport();
    }, 100);
  },

  onUnload() {
    this.stopAI();
    this.clearTimer();
  },

  // ============ 调试 HUD ============
  toggleDebugHUD() {
    const next = !this.data.debugEnabled;
    this.setData({ debugEnabled: next });
    if (next) {
      this.refreshDebugHUD(true);
      wx.showToast({ title: '调试 HUD 已开启', icon: 'none' });
    } else {
      this.setData({ debugText: '', debugLines: [] });
      wx.showToast({ title: '调试 HUD 已关闭', icon: 'none' });
    }
  },

  trackFps() {
    const now = Date.now();
    if (!this._fpsLastTs) {
      this._fpsLastTs = now;
      this._fpsCount = 0;
      return;
    }
    this._fpsCount += 1;
    const elapsed = now - this._fpsLastTs;
    if (elapsed >= 1000) {
      this.debugFps = Math.round((this._fpsCount * 1000) / elapsed);
      this._fpsCount = 0;
      this._fpsLastTs = now;
    }
  },

  refreshDebugHUD(force = false) {
    if (!this.data.debugEnabled) return;

    const now = Date.now();
    if (!force && this.debugLastUpdateAt && now - this.debugLastUpdateAt < 200) return;
    this.debugLastUpdateAt = now;

    const bodyAgo = this.lastBodySeenAt ? (now - this.lastBodySeenAt) : -1;
    const lines = [
      `FPS: ${this.debugFps}  loopCost: ${this.debugLastLoopCostMs}ms`,
      `anchors: ${this.didReceiveAnchors}  frames: ${this.didReceiveFrames}`,
      `getVKFrame: ${!!(this.session && typeof this.session.getVKFrame === 'function')}`,
      `frame: ${this.debugLastFrameShape || '-'}`,
      `bodies: ${this.debugLastBodies}  noBodyFrames: ${this.noBodyFrames}`,
      `kpts: ${this.debugLastKeypoints}  conf>=0.2: ${this.debugLastConfident}`,
      `bodySeenAgo: ${bodyAgo}ms`,
      `camera: ${this.data.vkCameraPosition}`,
      `cameraReady: ${this.cameraReady}`,
      `canvas: ${this.canvasW || 0}x${this.canvasH || 0}  ctx: ${!!this.ctx}`,
      this.debugLastError ? `lastError: ${this.debugLastError}` : ''
    ].filter(Boolean);

    this.setData({ debugText: lines.join('\n'), debugLines: lines });
  },

  toggleVKCamera() {
    const next = this.data.vkCameraPosition === 'front' ? 'back' : 'front';
    this.stopAI();
    this.setData({
      vkCameraPosition: next,
      guideText: `切换为${next === 'front' ? '前置' : '后置'}摄像头中...`,
      isDetecting: false
    });

    this.cameraReady = false;
    this.vkInitPending = true;

    setTimeout(() => {
      if (this.data.isAIMode && this.cameraReady) {
        this.initVisionKit();
      }
    }, 300);
  },

  normalizeExerciseCategory(category) {
    const val = String(category || '').toLowerCase();
    const allowed = new Set(['aerobic', 'strength', 'flexibility', 'sports']);
    return allowed.has(val) ? val : '';
  },

  detectExerciseCategory(name, aiExerciseType) {
    const strengthTypes = new Set([
      'squat', 'pushup', 'situp', 'plank', 'side_plank', 'pullup', 'lunge', 'jumping_lunge',
      'crunch', 'bicycle_crunch', 'russian_twist', 'leg_raise', 'glute_bridge', 'calf_raise',
      'wall_sit', 'hollow_hold', 'superman_hold', 'squat_hold'
    ]);
    const aerobicTypes = new Set([
      'jumping_jack', 'high_knees', 'burpee', 'jump_rope', 'running_in_place', 'running', 'mountain_climber'
    ]);
    const flexibilityTypes = new Set(['yoga_pose', 'stretch']);

    if (flexibilityTypes.has(aiExerciseType)) return 'flexibility';
    if (strengthTypes.has(aiExerciseType)) return 'strength';
    if (aerobicTypes.has(aiExerciseType)) return 'aerobic';

    const lowerName = String(name || '').toLowerCase();
    if (lowerName.includes('瑜伽') || lowerName.includes('yoga') || lowerName.includes('拉伸') || lowerName.includes('stretch')) {
      return 'flexibility';
    }
    if (
      lowerName.includes('俯卧撑') || lowerName.includes('pushup') ||
      lowerName.includes('深蹲') || lowerName.includes('squat') ||
      lowerName.includes('仰卧起坐') || lowerName.includes('situp') ||
      lowerName.includes('平板支撑') || lowerName.includes('plank') || lowerName.includes('支撑') ||
      lowerName.includes('卷腹') || lowerName.includes('crunch') ||
      lowerName.includes('弓步') || lowerName.includes('lunge') ||
      lowerName.includes('臀桥') || lowerName.includes('bridge') ||
      lowerName.includes('提踵') || lowerName.includes('calf') ||
      lowerName.includes('引体') || lowerName.includes('pullup')
    ) {
      return 'strength';
    }

    return 'aerobic';
  },

  // 根据运动名称判断 AI 检测类型
  detectAIExerciseType(name) {
    const lowerName = name.toLowerCase();

    // ============ 姿势保持类（优先匹配，避免与“撑/蹲”等关键词冲突） ============
    // 平板支撑 / 侧平板
    if (lowerName.includes('平板支撑') || lowerName.includes('plank') || lowerName.includes('支撑')) {
      return { type: 'plank', caloriesPerRep: 0, supportAI: true };
    }
    if (lowerName.includes('侧平板') || lowerName.includes('侧支撑') || lowerName.includes('side plank')) {
      return { type: 'side_plank', caloriesPerRep: 0, supportAI: true };
    }
    // 靠墙静蹲 / 静蹲
    if (lowerName.includes('靠墙') || lowerName.includes('静蹲') || lowerName.includes('靠墙坐') || lowerName.includes('wall sit')) {
      return { type: 'wall_sit', caloriesPerRep: 0, supportAI: true };
    }
    // 深蹲静止 / 蹲墙 / squat hold
    if (lowerName.includes('深蹲静止') || lowerName.includes('蹲墙') || lowerName.includes('squat hold')) {
      return { type: 'squat_hold', caloriesPerRep: 0, supportAI: true };
    }
    // 船式（hollow hold）/ 超人式保持
    if (lowerName.includes('船式') || lowerName.includes('hollow')) {
      return { type: 'hollow_hold', caloriesPerRep: 0, supportAI: true };
    }
    if (lowerName.includes('超人') || lowerName.includes('superman')) {
      return { type: 'superman_hold', caloriesPerRep: 0, supportAI: true };
    }

    // ============ 力量训练类 ============
    // 深蹲系列
    if (
      lowerName.includes('深蹲') ||
      lowerName.includes('squat') ||
      (lowerName.includes('蹲') && !lowerName.includes('弓步') && !lowerName.includes('箭步'))
    ) {
      return { type: 'squat', caloriesPerRep: 0.5, supportAI: true };
    }
    // 俯卧撑系列
    if (lowerName.includes('俯卧撑') || lowerName.includes('pushup') || lowerName.includes('push up')) {
      return { type: 'pushup', caloriesPerRep: 0.4, supportAI: true };
    }
    // 仰卧起坐
    if (lowerName.includes('仰卧起坐') || lowerName.includes('situp')) {
      return { type: 'situp', caloriesPerRep: 0.3, supportAI: true };
    }
    // 卷腹 / 自行车卷腹 / 俄罗斯转体 / 抬腿
    if (lowerName.includes('卷腹') || lowerName.includes('腹肌') || lowerName.includes('crunch')) {
      return { type: 'crunch', caloriesPerRep: 0.25, supportAI: true };
    }
    if (lowerName.includes('自行车') || lowerName.includes('bicycle')) {
      return { type: 'bicycle_crunch', caloriesPerRep: 0.3, supportAI: true };
    }
    if (lowerName.includes('俄罗斯') || lowerName.includes('转体') || lowerName.includes('russian')) {
      return { type: 'russian_twist', caloriesPerRep: 0.25, supportAI: true };
    }
    if (lowerName.includes('抬腿') || lowerName.includes('leg raise')) {
      return { type: 'leg_raise', caloriesPerRep: 0.25, supportAI: true };
    }
    // 臀桥 / 提踵
    if (lowerName.includes('臀桥') || lowerName.includes('glute bridge') || lowerName.includes('bridge')) {
      return { type: 'glute_bridge', caloriesPerRep: 0.25, supportAI: true };
    }
    if (lowerName.includes('提踵') || lowerName.includes('calf')) {
      return { type: 'calf_raise', caloriesPerRep: 0.12, supportAI: true };
    }
    // 引体向上
    if (lowerName.includes('引体向上') || lowerName.includes('pullup') || lowerName.includes('pull up')) {
      return { type: 'pullup', caloriesPerRep: 0.8, supportAI: true };
    }
    // 弓步蹲/箭步蹲
    if (lowerName.includes('弓步') || lowerName.includes('箭步') || lowerName.includes('lunge')) {
      return { type: 'lunge', caloriesPerRep: 0.5, supportAI: true };
    }

    // ============ 有氧运动类 ============
    // 开合跳
    if (lowerName.includes('开合跳') || lowerName.includes('jumping jack')) {
      return { type: 'jumping_jack', caloriesPerRep: 0.3, supportAI: true };
    }
    // 高抬腿
    if (lowerName.includes('高抬腿') || lowerName.includes('high knee')) {
      return { type: 'high_knees', caloriesPerRep: 0.2, supportAI: true };
    }
    // 登山跑
    if (lowerName.includes('登山') || lowerName.includes('mountain')) {
      return { type: 'mountain_climber', caloriesPerRep: 0.18, supportAI: true };
    }
    // 跳跃弓步
    if (lowerName.includes('跳跃弓步') || lowerName.includes('jump lunge') || lowerName.includes('jumping lunge')) {
      return { type: 'jumping_lunge', caloriesPerRep: 0.35, supportAI: true };
    }
    // 波比跳/Burpee
    if (lowerName.includes('波比') || lowerName.includes('burpee')) {
      return { type: 'burpee', caloriesPerRep: 1.0, supportAI: true };
    }
    // 跳绳（检测跳跃）
    if (lowerName.includes('跳绳') || lowerName.includes('rope')) {
      return { type: 'jump_rope', caloriesPerRep: 0.15, supportAI: true };
    }
    // 原地跑/原地踏步
    if (lowerName.includes('原地跑') || lowerName.includes('原地踏步') || lowerName.includes('踏步')) {
      return { type: 'running_in_place', caloriesPerRep: 0.1, supportAI: true };
    }

    // ============ 拉伸/瑜伽类（姿势保持检测）============
    // 瑜伽
    if (lowerName.includes('瑜伽') || lowerName.includes('yoga')) {
      return { type: 'yoga_pose', caloriesPerRep: 0, supportAI: true };
    }
    // 拉伸
    if (lowerName.includes('拉伸') || lowerName.includes('stretch')) {
      return { type: 'stretch', caloriesPerRep: 0, supportAI: true };
    }

    // ============ 不支持 AI 检测的运动 ============
    // 跑步、快走、骑行、游泳、登山、跳舞、举重、球类运动等
    // 这些运动要么需要移动（无法用前置摄像头），要么动作太复杂
    if (lowerName.includes('跑步') || lowerName.includes('慢跑') ||
        lowerName.includes('快走') || lowerName.includes('步行') ||
        lowerName.includes('骑行') || lowerName.includes('单车') ||
        lowerName.includes('游泳') || lowerName.includes('登山') ||
        lowerName.includes('跳舞') || lowerName.includes('舞蹈') ||
        lowerName.includes('举重') || lowerName.includes('哑铃') ||
        lowerName.includes('篮球') || lowerName.includes('足球') ||
        lowerName.includes('羽毛球') || lowerName.includes('网球') ||
        lowerName.includes('乒乓') || lowerName.includes('排球')) {
      return { type: 'unsupported', caloriesPerRep: 0, supportAI: false };
    }

    // 默认使用深蹲检测（通用性最好）
    return { type: 'squat', caloriesPerRep: 0.5, supportAI: true };
  },

  // ============ 计次/计时 自动匹配 ============
  getAIMetricModeByType(aiExerciseType) {
    const holdTypes = new Set([
      'plank',
      'side_plank',
      'wall_sit',
      'hollow_hold',
      'superman_hold',
      'squat_hold',
      'yoga_pose',
      'stretch'
    ]);
    return holdTypes.has(aiExerciseType) ? 'hold' : 'reps';
  },

  applyAIMetricMode(aiExerciseType) {
    const mode = this.getAIMetricModeByType(aiExerciseType);
    this.setData({
      aiMetricMode: mode,
      aiMetricUnit: mode === 'hold' ? '秒' : '次',
      aiMetricValue: 0,
      isTimeBasedMetric: mode === 'hold'
    });
  },

  // ============ 端侧 MVP：节拍器 + 提示 ============
  getDefaultMvpConfig(aiExerciseType) {
    const configs = {
      squat: {
        bpm: 40,
        tips: ['脚尖微外八，膝盖对齐脚尖', '核心收紧，背部挺直', '下蹲到大腿接近平行，再起身'],
      },
      pushup: {
        bpm: 30,
        tips: ['身体一条直线，核心收紧', '手腕在肩下，肘部约 45°', '下降到位再推起，避免塌腰'],
      },
      situp: {
        bpm: 35,
        tips: ['下背贴地，避免颈部代偿', '呼气起身，控制下放', '动作幅度适中，稳定节奏'],
      },
      plank: {
        bpm: 60,
        tips: ['肩在肘上方，核心收紧', '臀部不过高不过低', '保持均匀呼吸，别憋气'],
      },
      jumping_jack: {
        bpm: 90,
        tips: ['落地轻柔，膝踝稳定', '手脚协调，保持呼吸', '幅度适中，节奏优先'],
      },
      high_knees: {
        bpm: 100,
        tips: ['抬膝到髋部附近', '上身挺直，核心稳定', '落地轻，频率优先'],
      },
      burpee: {
        bpm: 35,
        tips: ['动作连贯，落地轻柔', '俯卧撑位核心收紧', '跳起伸展但不硬冲'],
      },
      jump_rope: {
        bpm: 120,
        tips: ['用前脚掌轻跳，膝微屈缓冲', '手腕发力带动绳，肩放松', '保持稳定频率，小跳优先'],
      },
      running_in_place: {
        bpm: 120,
        tips: ['身体直立，摆臂配合', '落地轻，节奏均匀', '核心稳定，避免左右晃动'],
      },
      lunge: {
        bpm: 35,
        tips: ['前膝对齐脚尖，后膝向地面', '躯干保持直立，核心收紧', '重心稳定，缓慢控制'],
      },
      jumping_lunge: {
        bpm: 50,
        tips: ['落地轻柔，膝盖稳定对齐脚尖', '躯干保持直立，核心收紧', '先稳后快，避免内扣'],
      },
      pullup: {
        bpm: 20,
        tips: ['肩胛先下压，再发力上拉', '避免耸肩与摆动借力', '下放控制，幅度完整'],
      },
      crunch: {
        bpm: 40,
        tips: ['下背贴地，核心发力', '避免用手拉头，颈部放松', '上卷停顿 0.5 秒再下放'],
      },
      bicycle_crunch: {
        bpm: 55,
        tips: ['肘碰对侧膝，旋转来自胸椎', '动作慢一点，确保对侧发力', '腰背贴地，避免塌腰'],
      },
      russian_twist: {
        bpm: 60,
        tips: ['背部挺直，核心收紧', '转体来自躯干，不要只甩手', '控制节奏，左右算一组或按节拍计数'],
      },
      leg_raise: {
        bpm: 30,
        tips: ['下背贴地，避免拱腰', '抬腿用腹部发力，控制下放', '膝可微屈，标准优先'],
      },
      glute_bridge: {
        bpm: 40,
        tips: ['脚跟发力，顶髋到位夹臀', '肋骨下沉，避免腰椎代偿', '顶端停顿 0.5 秒再下放'],
      },
      calf_raise: {
        bpm: 70,
        tips: ['脚踝完整伸展与回落', '顶端停顿 0.3 秒', '全程控制，避免弹跳'],
      },
      yoga_pose: {
        bpm: 60,
        tips: ['动作缓慢，保持稳定呼吸', '感觉到拉伸即可，不要硬撑', '对称调整，保持平衡'],
      },
      stretch: {
        bpm: 60,
        tips: ['每个拉伸保持 20-30 秒', '保持呼吸，不要反弹', '疼痛即停止，适度拉伸'],
      },
      mountain_climber: {
        bpm: 100,
        tips: ['核心收紧，臀部不要抬太高', '膝盖交替快速提向胸口', '手腕在肩下，落地轻快'],
      },
      wall_sit: {
        bpm: 60,
        tips: ['背贴墙，膝盖约 90°', '膝盖对齐脚尖，核心收紧', '保持呼吸，别憋气'],
      },
      side_plank: {
        bpm: 60,
        tips: ['肩在肘上方，身体成一直线', '臀部抬高，核心收紧', '保持稳定呼吸'],
      },
      hollow_hold: {
        bpm: 60,
        tips: ['下背贴地，肋骨下沉', '手脚伸直但不过度拱腰', '保持均匀呼吸'],
      },
      superman_hold: {
        bpm: 60,
        tips: ['颈部放松，视线向下', '抬胸抬腿，核心与臀背发力', '保持呼吸，避免耸肩'],
      },
      squat_hold: {
        bpm: 60,
        tips: ['膝盖对齐脚尖，重心在脚中后部', '核心收紧，背部挺直', '保持呼吸，稳定发力'],
      },
    };

    return configs[aiExerciseType] || { bpm: 45, tips: ['保持节奏，注意呼吸', '动作标准优先于速度', '感觉不适请立即停止'] };
  },

  startMvpTips() {
    if (!this.data.isAIMode) return;
    if (!this.data.isFallbackMode && !this.data.mvpExpanded) return;
    const { tips } = this.getDefaultMvpConfig(this.data.aiExerciseType);
    if (!tips || tips.length === 0) return;

    const pick = () => {
      const idx = Math.floor(Math.random() * tips.length);
      this.setData({ tipText: tips[idx] });
    };

    pick();
    if (this.tipTimerId) clearInterval(this.tipTimerId);
    this.tipTimerId = setInterval(() => {
      if (!this.data.isAIMode || (!this.data.isFallbackMode && !this.data.mvpExpanded) || this.data.isPaused) return;
      pick();
    }, 8000);
  },

  stopMvpTips() {
    if (this.tipTimerId) {
      clearInterval(this.tipTimerId);
      this.tipTimerId = null;
    }
  },

  startMetronome() {
    if (!this.data.isAIMode) return;
    if (!this.data.isFallbackMode && !this.data.mvpExpanded) return;
    if (!this.data.metronomeEnabled) return;
    if (this.metronomeTimerId) return;

    const bpm = Math.max(20, Math.min(200, Number(this.data.metronomeBpm) || 45));
    const intervalMs = Math.round(60000 / bpm);
    this.metronomeNextAt = Date.now() + intervalMs;
    this._metronomeBeat = Number(this.data.metronomeBeat) || 0;
    this._beatsInRep = Number(this.data.beatsInRep) || 0;

    const tick = () => {
      if (!this.data.isAIMode || (!this.data.isFallbackMode && !this.data.mvpExpanded)) {
        this.stopMetronome();
        return;
      }
      if (this.data.isPaused || !this.data.metronomeEnabled) {
        this.metronomeNextAt = Date.now() + intervalMs;
      } else {
        this._metronomeBeat = (this._metronomeBeat + 1) % 8;

        const updates = { metronomeBeat: this._metronomeBeat, metronomeFlash: true };

        if (this.data.autoCountEnabled && !this.data.isTimeBasedMetric) {
          const beatsPerRep = Math.max(1, Math.min(8, Number(this.data.beatsPerRep) || 2));
          this._beatsInRep = (this._beatsInRep + 1) % beatsPerRep;
          updates.beatsInRep = this._beatsInRep;

          // 简单相位提示
          if (beatsPerRep === 2) {
            updates.phaseText = this._beatsInRep === 1 ? '上' : '下';
          } else if (beatsPerRep === 4) {
            updates.phaseText = ['下', '保持', '上', '保持'][this._beatsInRep] || '';
          } else {
            updates.phaseText = '跟节拍';
          }

          // 每完成一次动作（到达 rep 边界）+1
          if (this._beatsInRep === 0) {
            const newCount = this.data.aiCount + 1;
            updates.aiCount = newCount;
            updates.aiMetricValue = newCount;
            updates.guideText = '✅ +1（节拍计数）';
            updates.currentCalories = this.calculateCalories(this.data.seconds);
          }

          // 当前节奏展示为目标节奏（估算）
          updates.cadenceRpm = this.data.targetCadenceRpm || Math.round(bpm / beatsPerRep);
        }

        this.setData(updates);
        wx.vibrateShort({ type: 'light' }).catch(() => {});
        setTimeout(() => {
          if (this.data.isAIMode && (this.data.isFallbackMode || this.data.mvpExpanded)) this.setData({ metronomeFlash: false });
        }, 80);
      }

      const now = Date.now();
      const delay = Math.max(0, this.metronomeNextAt - now);
      this.metronomeNextAt += intervalMs;
      this.metronomeTimerId = setTimeout(tick, delay);
    };

    this.metronomeTimerId = setTimeout(tick, intervalMs);
  },

  stopMetronome() {
    if (this.metronomeTimerId) {
      clearTimeout(this.metronomeTimerId);
      this.metronomeTimerId = null;
    }
    this.metronomeNextAt = 0;
    if (this.data.metronomeFlash) this.setData({ metronomeFlash: false });
  },

  refreshTargetCadence() {
    const bpm = Math.max(20, Math.min(200, Number(this.data.metronomeBpm) || 45));
    const beatsPerRep = Math.max(1, Math.min(8, Number(this.data.beatsPerRep) || 2));
    const target = Math.round(bpm / beatsPerRep);
    this.setData({ targetCadenceRpm: target });
  },

  toggleMetronome() {
    const next = !this.data.metronomeEnabled;
    this.setData({ metronomeEnabled: next });
    if (next) this.startMetronome();
    else this.stopMetronome();
  },

  toggleMvpPanel() {
    const next = !this.data.mvpExpanded;
    this.setData({ mvpExpanded: next });

    if (next) {
      this.startMvpTips();
      this.startMetronome();
    } else {
      // 非降级模式下，收起面板即停止节拍器/提示，避免“后台震动”
      if (!this.data.isFallbackMode) {
        this.stopMetronome();
        this.stopMvpTips();
        this.setData({ tipText: '', phaseText: '' });
      }
    }
  },

  changeMetronomeBpm(e) {
    const bpm = Number(e?.detail?.value);
    if (!Number.isFinite(bpm)) return;
    this.setData({ metronomeBpm: bpm });
    this.refreshTargetCadence();
    this.stopMetronome();
    this.startMetronome();
  },

  adjustMetronomeBpm(e) {
    const step = Number(e?.currentTarget?.dataset?.delta);
    if (!Number.isFinite(step)) return;
    const next = Math.max(20, Math.min(200, (Number(this.data.metronomeBpm) || 45) + step));
    this.setData({ metronomeBpm: next });
    this.refreshTargetCadence();
    this.stopMetronome();
    this.startMetronome();
  },

  toggleAutoCount() {
    const next = !this.data.autoCountEnabled;
    this.setData({
      autoCountEnabled: next,
      beatsInRep: 0,
      phaseText: next ? '跟节拍' : ''
    });
    this._beatsInRep = 0;
    this.refreshTargetCadence();
  },

  setBeatsPerRep(e) {
    const next = Number(e?.currentTarget?.dataset?.bpr);
    if (!Number.isFinite(next)) return;
    const beatsPerRep = Math.max(1, Math.min(8, next));
    this.setData({ beatsPerRep, beatsInRep: 0 });
    this._beatsInRep = 0;
    this.refreshTargetCadence();
  },

  startTimer() {
    if (this.data.timerInterval) {
      return;
    }

    const interval = setInterval(() => {
      if (!this.data.isPaused) {
        const newSeconds = this.data.seconds + 1;
        const formatted = this.formatTime(newSeconds);
        const calories = this.calculateCalories(newSeconds);

        const updates = {
          seconds: newSeconds,
          formattedTime: formatted,
          currentCalories: calories
        };

        // 简化模式 + 计时类运动：用总时长作为“计时指标”
        if (this.data.isAIMode && this.data.isFallbackMode && this.data.isTimeBasedMetric) {
          updates.aiMetricValue = newSeconds;
        }

        this.setData(updates);
      }
    }, 1000);

    this.setData({
      timerInterval: interval
    });
  },

  clearTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.setData({
        timerInterval: null
      });
    }
  },

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  calculateCalories(seconds) {
    const minutes = seconds / 60;
    let baseCalories = Math.round(minutes * this.data.caloriesPerMin);

    // AI 模式下，加上动作计数带来的额外热量
    if (this.data.isAIMode && this.data.aiCount > 0) {
      const aiBonus = Math.round(this.data.aiCount * this.data.aiCaloriesPerRep);
      baseCalories += aiBonus;
    }

    return baseCalories;
  },

  togglePause() {
    const newPaused = !this.data.isPaused;
    this.setData({
      isPaused: newPaused
    });

    if (!newPaused && !this.data.timerInterval) {
      this.startTimer();
    }
    // 暂停/继续时同步节拍器（简化模式）
    if (this.data.isAIMode && (this.data.isFallbackMode || this.data.mvpExpanded)) {
      if (newPaused) this.stopMetronome();
      else this.startMetronome();
    }
  },

  finishExercise() {
    // 先停止 AI 检测（如果在 AI 模式下）
    if (this.data.isAIMode) {
      this.stopAI();
    }

    const wasRunning = !!this.data.timerInterval;
    this.clearTimer();
    this.setData({ isPaused: true });

    const seconds = this.data.seconds;

    // 不满 30 秒不保存
    if (seconds < 30) {
      wx.showModal({
        title: '放弃本次运动?',
        content: '运动时长不足 30 秒，无法保存记录。是否确认退出？',
        confirmText: '退出',
        confirmColor: '#FF6B35',
        cancelText: '继续',
        success: (res) => {
          if (res.confirm) {
            this.setData({ isAIMode: false });
            wx.navigateBack();
          } else {
            if (wasRunning) this.startTimer();
            this.setData({ isPaused: false });
          }
        }
      });
      return;
    }

    // 生成结束信息
    let content = `时长：${this.data.formattedTime}\n消耗：${this.data.currentCalories} kcal`;
    if (this.data.isTimeBasedMetric) {
      const holdSeconds = this.data.poseHoldTime || this.data.seconds;
      content += `\n保持：${holdSeconds} 秒`;
    } else if (this.data.aiCount > 0) {
      content += `\nAI 计数：${this.data.aiCount} 次`;
    }

    wx.showModal({
      title: '结束运动',
      content: `确定要结束吗？\n${content}`,
      confirmText: '完成',
      confirmColor: '#2DD4BF',
      cancelText: '继续',
      success: (res) => {
        if (res.confirm) {
          this.saveExerciseRecord();
        } else {
          if (wasRunning) this.startTimer();
          this.setData({ isPaused: false });
        }
      }
    });
  },

  async saveExerciseRecord() {
    wx.showLoading({ title: '保存中...' });

    try {
      const wasAIMode = this.data.isAIMode;
      const aiExerciseType = this.data.aiExerciseType;
      const aiMetricMode = this.data.aiMetricMode;
      const aiCount = this.data.aiCount;
      const aiHoldSeconds = aiMetricMode === 'hold' ? (this.data.poseHoldTime || this.data.seconds || 0) : 0;

      // 停止所有活动
      this.stopAI();
      this.clearTimer();
      this.setData({ isAIMode: false });

      const duration = Math.max(1, Math.round(this.data.seconds / 60));
      const calories = this.data.currentCalories;
      const today = new Date().toISOString().slice(0, 10);
      const exerciseCategory = this.data.exerciseCategory || this.detectExerciseCategory(this.data.exerciseName, this.data.aiExerciseType);

      const db = wx.cloud.database();
      await db.collection('exercise_records').add({
        data: {
          name: this.data.exerciseName,
          exerciseType: exerciseCategory,
          duration: duration,
          calories: calories,
          caloriesPerMin: this.data.caloriesPerMin,
          recordDate: today,
          createTime: new Date(),
          startTime: new Date(Date.now() - this.data.seconds * 1000).toISOString(),
          endTime: new Date().toISOString(),
          // AI 相关数据
          aiEnabled: wasAIMode,
          aiExerciseType,
          aiMetricMode,
          aiCount,
          aiHoldSeconds
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '已完成', icon: 'success', duration: 1500 });

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/exercise/index/index'
        });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('[Timer] 保存失败:', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  // ============ AI 支持检测 ============
  checkAISupport() {
    console.log('[AI检测] 开始检测设备支持...');

    // 获取系统信息
    const sys = wx.getSystemInfoSync();
    const sdkVersion = sys.SDKVersion || '';
    const platform = sys.platform || '';

    console.log('[AI检测] 系统信息:', {
      platform,
      sdkVersion,
      system: sys.system
    });

    // 方法1: 检查 VisionKit API 是否存在
    if (typeof wx.createVKSession === 'function') {
      console.log('[AI检测] ✅ VisionKit API 存在，启用 AI 功能');
      this.setData({ canUseAI: true });
      return;
    }

    // 方法2: 基础库版本 >= 2.24.0 理论上支持
    if (this.compareVersion(sdkVersion, '2.24.0') >= 0) {
      console.log('[AI检测] ✅ 基础库版本支持:', sdkVersion);
      this.setData({ canUseAI: true });
      return;
    }

    // 模拟器或开发工具中也显示按钮（方便测试 UI）
    if (platform === 'devtools') {
      console.log('[AI检测] ⚠️ 开发工具环境，显示按钮用于测试');
      this.setData({ canUseAI: true });
      return;
    }

    // 默认也显示按钮，点击时再检测并给出提示
    console.log('[AI检测] ⚠️ 无法确定是否支持，默认显示按钮');
    this.setData({ canUseAI: true });
  },

  // 版本比较
  compareVersion(v1, v2) {
    const arr1 = v1.split('.').map(Number);
    const arr2 = v2.split('.').map(Number);
    const len = Math.max(arr1.length, arr2.length);

    for (let i = 0; i < len; i++) {
      const n1 = arr1[i] || 0;
      const n2 = arr2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  },

  // ============ 模式切换 ============
  switchMode() {
    const targetMode = !this.data.isAIMode;

    if (targetMode) {
      // 检查当前运动是否支持 AI
      if (!this.data.supportAI) {
        wx.showModal({
          title: '该运动暂不支持 AI 指导',
          content: `"${this.data.exerciseName}" 需要移动或动作复杂，暂不支持 AI 实时分析。\n\n支持的运动：深蹲、俯卧撑、仰卧起坐、平板支撑、开合跳、高抬腿等原地运动。`,
          showCancel: false,
          confirmText: '我知道了'
        });
        return;
      }

      // 检查设备是否支持 VisionKit
      if (typeof wx.createVKSession !== 'function') {
        wx.showModal({
          title: '设备不支持',
          content: 'AI 实时指导需要较新的微信版本和设备支持。请升级微信或在支持的设备上使用。',
          showCancel: false,
          confirmText: '我知道了'
        });
        return;
      }

      // 先检查摄像头权限状态
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.camera'] === true) {
            // 已有权限，直接启动
            this.startAIMode(false);
          } else if (res.authSetting['scope.camera'] === false) {
            // 之前拒绝过，引导去设置
            wx.showModal({
              title: '需要摄像头权限',
              content: 'AI 实时指导需要使用摄像头来分析您的动作。',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting();
                }
              }
            });
          } else {
            // 首次请求权限
            wx.authorize({
              scope: 'scope.camera',
              success: () => {
                // 首次授权成功，需要更长的延迟让系统准备好
                this.startAIMode(true); // 标记为首次授权
              },
              fail: () => {
                wx.showToast({
                  title: '需要摄像头权限',
                  icon: 'none'
                });
              }
            });
          }
        }
      });
    } else {
      this.stopAI();
      this.setData({
        isAIMode: false,
        guideText: '',
        isDetecting: false
      });
      this.actionState = null;
    }
  },

  // 启动 AI 模式
  startAIMode(isFirstAuth = false) {
    // 进入 AI 模式前，确保计量方式与当前运动匹配
    this.applyAIMetricMode(this.data.aiExerciseType);

    this.setData({
      isAIMode: true,
      aiCount: 0,
      guideText: '正在启动摄像头...',
      poseHoldTime: 0,
      isPoseHeld: false,
      aiMetricValue: 0,
      cadenceRpm: 0,
      beatsInRep: 0,
      phaseText: ''
    });
    this.actionState = null;
    this.cameraReady = false;
    this.vkInitPending = true;

    // 首次授权需要等待更长时间让摄像头完全初始化
    // 同时也等待 onCameraInit 事件
    const delay = isFirstAuth ? 1500 : 500;

    setTimeout(() => {
      // 如果 camera 已经 ready，直接初始化
      if (this.cameraReady) {
        this.initVisionKit();
      }
      // 否则标记等待中，onCameraInit 会触发初始化
    }, delay);
  },

  // === 1. 初始化 VisionKit (增强版) ===
  initVisionKit(retryCount = 0) {
    if (this.session) return;
    this.vkInitPending = false;
    console.log('[VisionKit] 开始初始化...');
    this.hasBodyEverDetected = false;
    this.lastBodySeenAt = 0;
    this.didReceiveAnchors = false;
    this.didReceiveFrames = false;
    this.debugLastUpdateAt = 0;
    this.debugFps = 0;
    this.debugLastLoopCostMs = 0;
    this.debugLastFrameShape = '';
    this.debugLastKeypoints = 0;
    this.debugLastConfident = 0;
    this.debugLastError = '';
    this.debugLastBodies = 0;
    this.noBodyFrames = 0;
    this.totalLoopFrames = 0;
    this._fpsCount = 0;
    this._fpsLastTs = 0;

    // 1. API 检查
    if (typeof wx.createVKSession !== 'function') {
      console.error('[VisionKit] API 不存在，请检查基础库版本');
      wx.showToast({ title: '当前微信版本不支持 AI', icon: 'none' });
      return;
    }

    // 2. 创建 Session
    const session = wx.createVKSession({
      track: {
        body: { mode: 1 } // 开启人体关键点检测
      },
      version: 'v1'
    });

    this.session = session;

    // [关键修复] 监听错误事件
    session.on('error', (error) => {
      console.error('[VisionKit] Session 报错:', error);
      const errorMsg = error.code || error.message || '未知错误';
      console.error('[VisionKit] 错误详情:', JSON.stringify(error));
      this.debugLastError = String(errorMsg);
      this.refreshDebugHUD(true);
      wx.showToast({ title: 'AI 引擎错误: ' + errorMsg, icon: 'none', duration: 3000 });
    });

    // [核心修复] 监听锚点更新
    session.on('updateAnchors', (anchors) => {
      const list = Array.isArray(anchors) ? anchors : (anchors && anchors.anchors) ? anchors.anchors : [];
      if (!Array.isArray(list) || list.length === 0) return;

      this.didReceiveAnchors = true;
      this.refreshDebugHUD();

      const anchorWithPoints =
        list.find(a => Array.isArray(a?.points) && a.points.length > 0) ||
        list.find(a => Array.isArray(a?.keypoints) && a.keypoints.length > 0) ||
        list[0];

      const rawPoints =
        anchorWithPoints?.points ||
        anchorWithPoints?.keypoints ||
        anchorWithPoints?.body?.points ||
        anchorWithPoints?.body?.keypoints;

      if (Array.isArray(rawPoints) && rawPoints.length > 0) {
        this.processBodyPoints(rawPoints);
      } else {
        console.log('[VisionKit] 锚点无点位数据:', {
          type: anchorWithPoints?.type,
          keys: anchorWithPoints ? Object.keys(anchorWithPoints) : []
        });
      }
    });

    // [新增] 帧数据监听（兼容某些不触发 anchors 的机型，保持引擎活跃）
    session.on('frame', (timestamp) => {
      // AI 引擎正在运转的心跳信号
      // 主要数据处理在 runLoop 的 getVKFrame 中进行
      this.didReceiveFrames = true;
      this.refreshDebugHUD();
    });

    // 监听人体移除
    session.on('removeAnchors', () => {
      console.log('[VisionKit] 人体丢失');
      this.lastBodySeenAt = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);
      this.setData({ guideText: '未检测到人体' });
    });

    // 3. 启动 Session
    const startSession = (cb) => {
      try {
        if (typeof session.start === 'function' && session.start.length >= 2) {
          session.start({ cameraPosition: this.data.vkCameraPosition, cameraId: 'vkCamera' }, cb);
          return;
        }
      } catch (e) {
        // 继续走无参启动
      }
      session.start(cb);
    };

    startSession((err) => {
      if (err) {
        console.error('[VisionKit] 启动失败:', err);
        console.error('[VisionKit] 错误详情:', JSON.stringify(err));
        this.debugLastError = String(err?.code || err?.message || '启动失败');
        this.refreshDebugHUD(true);
        wx.showToast({ 
          title: 'AI 启动失败: ' + (err.code || err.message || '未知'), 
          icon: 'none',
          duration: 3000
        });
        return;
      }

      console.log('[VisionKit] ✅ 启动成功');
      console.log('[VisionKit] Session 状态:', {
        isStarted: true,
        hasError: false,
        canvasReady: !!this.ctx
      });
      
      this.setData({
        isDetecting: true,
        guideText: '请站在画面中央，等待检测...'
      });
      
      // 先初始化 Canvas
      this.initCanvas();
      
      // 延迟一点启动循环，确保 Canvas 已初始化
      setTimeout(() => {
        console.log('[VisionKit] 开始启动循环，Canvas 状态:', {
          ctx: !!this.ctx,
          canvasW: this.canvasW,
          canvasH: this.canvasH
        });
        
        // 启动心跳循环 (部分机型需要驱动)
        this.runLoop();
        
        // 设置超时检测：如果 3 秒后仍未检测到人体，给出提示
        setTimeout(() => {
          if (!this.data.isAIMode || !this.session) return;

          const noBodyForLong =
            !this.lastBodySeenAt || (Date.now() - this.lastBodySeenAt > 3000);

          if (noBodyForLong) {
            console.warn('[VisionKit] 3秒仍未检测到人体，状态:', {
              didReceiveAnchors: this.didReceiveAnchors,
              didReceiveFrames: this.didReceiveFrames,
              hasGetVKFrame: typeof this.session.getVKFrame === 'function'
            });
            this.setData({
              guideText: '请将手机放远，确保全身入镜，并保持光线充足'
            });
          }
        }, 3000);
      }, 200); 
    });
  },

  // [核心修复] 强制驱动循环 - 使用 3:4 标准比例防止图像变形
  runLoop() {
    if (this.data.isAIMode && this.session) {
      const t0 = Date.now();
      try {
        if (typeof this.session.getVKFrame === 'function') {
          const frameW = 480;
          const frameH = 640;
          const frame = this.session.getVKFrame(frameW, frameH);

          // 兼容不同返回结构
          const bodies = frame?.body?.bodies || frame?.bodies || frame?.body?.persons || [];
          const firstBody = Array.isArray(bodies) ? bodies[0] : null;
          const keypoints = firstBody?.keypoints || firstBody?.points;
          const hasBodyField = !!frame?.body;
          const bodyKeys = frame?.body ? Object.keys(frame.body).slice(0, 6).join(',') : '-';
          this.debugLastFrameShape = `w${frameW} h${frameH} body:${hasBodyField} bodies:${Array.isArray(bodies) ? bodies.length : 0} keys:${bodyKeys}`;
          this.debugLastBodies = Array.isArray(bodies) ? bodies.length : 0;
          this.totalLoopFrames += 1;

          if (this.debugLastBodies > 0) {
            this.noBodyFrames = 0;
          } else {
            this.noBodyFrames += 1;
          }

          if (Array.isArray(keypoints) && keypoints.length > 0) {
            this.processBodyPoints(keypoints, frameW, frameH);
          }

          // 长时间无人体数据：判定为该设备不支持人体识别，自动降级
          if (!this.hasBodyEverDetected && this.noBodyFrames >= 180) { // ~6 秒
            console.warn('[VisionKit] 长时间无人体输出，自动降级到简化模式');
            this.debugLastError = 'VisionKit 无人体输出（可能为机型/系统限制）';
            this.refreshDebugHUD(true);
            this.initFallbackMode();
          }
        }
      } catch (e) {
        if (!this.loopErrorLogged) {
          this.loopErrorLogged = true;
          this.debugLastError = String(e?.message || e);
          console.warn('[VisionKit] getVKFrame 读取失败（仅提示一次）:', e);
        }
      }

      this.debugLastLoopCostMs = Date.now() - t0;
      this.trackFps();
      this.refreshDebugHUD();

      // 不依赖 session.requestAnimationFrame（不同机型/基础库可能不存在）
      if (this.loopTimerId) clearTimeout(this.loopTimerId);
      this.loopTimerId = setTimeout(() => this.runLoop(), 33);
    }
  },

  // === 2. 处理并绘制关键点 (坐标映射修复版) ===
  processBodyPoints(points, frameW, frameH) {
    if (!points || points.length === 0) return;

    const hasCanvas = !!this.ctx && this.canvasW && this.canvasH;
    if (!hasCanvas) {
      // Canvas 未就绪时，仍然允许动作逻辑先跑起来（后续 Canvas 初始化后会正常绘制）
      // 但为了避免噪声，这里不提前 return，让 analyzeAction 能更新 guideText
    }

    const denomW = frameW || 480;
    const denomH = frameH || 640;
    const isPixelCoords = points.some(p =>
      (typeof p?.x === 'number' && p.x > 2) || (typeof p?.y === 'number' && p.y > 2)
    );

    // 1) 归一化点位（用于动作分析；阈值逻辑基于 0~1 坐标系）
    const shouldMirror = this.data.vkCameraPosition === 'front';
    const keypointsNorm = points.map((p) => {
      const rawX = typeof p?.x === 'number' ? p.x : null;
      const rawY = typeof p?.y === 'number' ? p.y : null;

      const x01 = rawX == null ? null : (isPixelCoords ? rawX / denomW : rawX);
      const y01 = rawY == null ? null : (isPixelCoords ? rawY / denomH : rawY);

      const score =
        (p?.conf ?? p?.score ?? p?.confidence ?? p?.probability ?? 0);

      if (x01 == null || y01 == null) return { x: 0, y: 0, score: 0 };

      // 前置摄像头镜像：让屏幕坐标与人体左右一致（便于后续规则判断）
      return { x: shouldMirror ? (1 - x01) : x01, y: y01, score };
    });

    // 标记“是否检测到人体”（用于超时提示）
    const confidentCount = keypointsNorm.filter(p => p && p.score >= 0.2).length;
    if (confidentCount >= 5) {
      this.lastBodySeenAt = Date.now();
      this.hasBodyEverDetected = true;
    }
    this.debugLastKeypoints = keypointsNorm.length;
    this.debugLastConfident = confidentCount;
    this.refreshDebugHUD();

    // 2) 绘制用像素坐标
    if (hasCanvas) {
      const keypointsDraw = keypointsNorm.map(p => ({
        ...p,
        x: p.x * this.canvasW,
        y: p.y * this.canvasH
      }));

      this.drawSkeleton(this.ctx, keypointsDraw);

      // [调试神器] 红鼻子
      const nose = keypointsDraw[0];
      if (nose && nose.score > 0.5) {
        this.ctx.fillStyle = 'red';
        this.ctx.beginPath();
        this.ctx.arc(nose.x, nose.y, 10, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // 进行动作分析
    this.analyzeAction(keypointsNorm);
  },

  // 备用方案：使用 CameraFrameListener 手动处理
  initFallbackMode() {
    console.log('[Fallback] 启用备用模式 - 简化计数');

    // 停止 VisionKit 引擎（保留摄像头预览 + HUD）
    if (this.loopTimerId) {
      clearTimeout(this.loopTimerId);
      this.loopTimerId = null;
    }
    if (this.session) {
      try {
        this.session.stop();
        this.session.destroy();
      } catch (e) {}
      this.session = null;
    }

    const mvp = this.getDefaultMvpConfig(this.data.aiExerciseType);
    const isTimeBased = this.data.isTimeBasedMetric;

    this.setData({
      isDetecting: true,
      isFallbackMode: true,
      mvpExpanded: true,
      aiMetricValue: 0,
      guideText: isTimeBased
        ? '当前设备无法输出骨骼点，已启用简化模式（计时/保持）'
        : '当前设备无法输出骨骼点，已启用简化模式（节拍自动计数）',
      metronomeBpm: mvp.bpm,
      metronomeBeat: 0,
      autoCountEnabled: !isTimeBased,
      beatsPerRep: 2,
      beatsInRep: 0,
      phaseText: isTimeBased ? '保持呼吸' : '跟节拍'
    });
    this.refreshTargetCadence();

    // 简化模式：只计时，不做姿势检测
    setTimeout(() => {
      this.setData({
        guideText: isTimeBased
          ? '开始保持，跟随提示节奏呼吸'
          : '开始运动，跟节拍自动计数（可切换手动）'
      });
    }, 2000);

    this.fallbackMode = true;
    this.startMvpTips();
    this.startMetronome();
  },

  // 备用模式：手动计数
  onAIViewTap() {
    if (this.fallbackMode && this.data.isAIMode && !this.data.isPaused && !this.data.autoCountEnabled && !this.data.isTimeBasedMetric) {
      const now = Date.now();
      this.cadenceSamples.unshift(now);
      this.cadenceSamples = this.cadenceSamples.filter(t => now - t <= 12000);
      if (this.cadenceSamples.length >= 2) {
        const elapsed = now - this.cadenceSamples[this.cadenceSamples.length - 1];
        if (elapsed > 0) {
          const rpm = Math.round(((this.cadenceSamples.length - 1) * 60000) / elapsed);
          this.setData({ cadenceRpm: rpm });
        }
      }

      const newCount = this.data.aiCount + 1;
      const currentCalories = this.calculateCalories(this.data.seconds);

      this.setData({
        aiCount: newCount,
        aiMetricValue: newCount,
        guideText: '✅ +1',
        currentCalories: currentCalories
      });

      wx.vibrateShort({ type: 'light' }).catch(() => {});

      setTimeout(() => {
        if (this.data.aiCount === newCount) {
          this.setData({ guideText: '点击屏幕计数' });
        }
      }, 800);
    }
  },

  stopAI() {
    console.log('[VisionKit] 停止 AI 功能');

    this.stopMetronome();
    this.stopMvpTips();
    
    // 停止循环
    if (this.loopTimerId) {
      clearTimeout(this.loopTimerId);
      this.loopTimerId = null;
    }
    this.vkFrameId = null;

    if (this.session) {
      try {
        this.session.stop();
        this.session.destroy();
        console.log('[VisionKit] Session已停止并销毁');
      } catch (e) {
        console.error('[VisionKit] 停止异常:', e);
      }
      this.session = null;
    }
    this.ctx = null;
    this.canvasW = 0;
    this.canvasH = 0;
    this.cameraReady = false;
    this.vkInitPending = false;
    this.fallbackMode = false;
    this.loopErrorLogged = false;
    this.hasBodyEverDetected = false;
    this.lastBodySeenAt = 0;
    this.didReceiveAnchors = false;
    this.didReceiveFrames = false;
    this.debugLastUpdateAt = 0;
    this.debugFps = 0;
    this.debugLastLoopCostMs = 0;
    this.debugLastFrameShape = '';
    this.debugLastKeypoints = 0;
    this.debugLastConfident = 0;
    this.debugLastError = '';
    this.debugLastBodies = 0;
    this.noBodyFrames = 0;
    this.totalLoopFrames = 0;
    this._fpsCount = 0;
    this._fpsLastTs = 0;
    this.setData({
      isDetecting: false,
      guideText: '',
      debugText: '',
      debugLines: [],
      isFallbackMode: false,
      mvpExpanded: false,
      tipText: '',
      aiMetricValue: 0,
      cadenceRpm: 0,
      targetCadenceRpm: 0,
      autoCountEnabled: false,
      beatsPerRep: 2,
      beatsInRep: 0,
      phaseText: '',
      metronomeBeat: 0,
      metronomeFlash: false
    });
  },

  // ============ Canvas 绘图 ============
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#poseCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0] && res[0].node) {
          const canvas = res[0].node;
          const dpr = wx.getSystemInfoSync().pixelRatio || 1;
          
          // 设置 Canvas 物理尺寸（考虑设备像素比）
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          
          // 获取 2D 上下文
          this.ctx = canvas.getContext('2d');
          
          // 缩放上下文以匹配设备像素比（这样绘制时使用逻辑像素）
          this.ctx.scale(dpr, dpr);
          
          // 保存逻辑尺寸（用于坐标映射）
          this.canvasW = res[0].width;
          this.canvasH = res[0].height;
          
          console.log('[VisionKit] Canvas 初始化成功:', {
            width: this.canvasW,
            height: this.canvasH,
            dpr: dpr,
            physicalWidth: canvas.width,
            physicalHeight: canvas.height
          });
        } else {
          console.error('[VisionKit] Canvas 节点获取失败');
        }
      });
  },

  drawSkeleton(ctx, keypoints) {
    if (!keypoints || keypoints.length === 0) return;

    // 先清空画布
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    // 骨骼连接关系
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [5, 6], [5, 11], [6, 12], [11, 12],
      [5, 7], [7, 9],
      [6, 8], [8, 10],
      [11, 13], [13, 15],
      [12, 14], [14, 16]
    ];

    ctx.strokeStyle = '#2DD4BF';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    connections.forEach(([start, end]) => {
      const startPoint = keypoints[start];
      const endPoint = keypoints[end];

      if (startPoint && endPoint &&
          startPoint.score > 0.3 && endPoint.score > 0.3) {
        ctx.beginPath();
        // [修复] 坐标已经在 processBodyPoints 中映射过了，直接使用
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });

    ctx.fillStyle = '#0F766E';
    keypoints.forEach((point) => {
      if (point && point.score > 0.3) {
        ctx.beginPath();
        // [修复] 坐标已经在 processBodyPoints 中映射过了，直接使用
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },

  // ============ 动作分析 ============
  analyzeAction(keypoints) {
    const type = this.data.aiExerciseType;

    switch (type) {
      // 力量训练
      case 'squat':
        this.analyzeSquat(keypoints);
        break;
      case 'pushup':
        this.analyzePushup(keypoints);
        break;
      case 'situp':
        this.analyzeSitup(keypoints);
        break;
      case 'plank':
        this.analyzePlank(keypoints);
        break;
      case 'pullup':
        this.analyzePullup(keypoints);
        break;
      case 'lunge':
        this.analyzeLunge(keypoints);
        break;
      case 'jumping_lunge':
        this.analyzeLunge(keypoints);
        break;
      case 'crunch':
      case 'bicycle_crunch':
      case 'leg_raise':
      case 'russian_twist':
      case 'glute_bridge':
      case 'calf_raise':
        this.analyzeSitup(keypoints);
        break;

      // 有氧运动
      case 'jumping_jack':
        this.analyzeJumpingJack(keypoints);
        break;
      case 'high_knees':
        this.analyzeHighKnees(keypoints);
        break;
      case 'mountain_climber':
        this.analyzeHighKnees(keypoints);
        break;
      case 'burpee':
        this.analyzeBurpee(keypoints);
        break;
      case 'jump_rope':
        this.analyzeJumpRope(keypoints);
        break;
      case 'running_in_place':
        this.analyzeRunningInPlace(keypoints);
        break;

      // 拉伸/瑜伽
      case 'yoga_pose':
      case 'stretch':
      case 'wall_sit':
      case 'squat_hold':
      case 'hollow_hold':
      case 'superman_hold':
        this.analyzePoseHold(keypoints);
        break;
      case 'side_plank':
        this.analyzePlank(keypoints);
        break;

      default:
        this.analyzeSquat(keypoints);
    }
  },

  // ============ 力量训练检测 ============

  // 深蹲检测
  analyzeSquat(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    if (!this.checkKeypoints([leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle])) {
      this.setData({ guideText: '请确保下半身在画面中' });
      return;
    }

    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;

    const kneeHipRatio = (avgKneeY - avgHipY);

    const isDown = kneeHipRatio > 0.08;
    const isUp = kneeHipRatio < 0.03;

    this.processActionState('squat', isDown, isUp, {
      downText: '保持下蹲姿势',
      upText: '',
      needDeeperText: '再蹲低一点',
      goodText: '很好，保持住'
    });
  },

  // 俯卧撑检测
  analyzePushup(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];

    if (!this.checkKeypoints([leftShoulder, rightShoulder, leftElbow, rightElbow])) {
      this.setData({ guideText: '请确保上半身在画面中' });
      return;
    }

    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgElbowY = (leftElbow.y + rightElbow.y) / 2;

    const elbowBend = avgElbowY - avgShoulderY;

    const isDown = elbowBend < -0.02;
    const isUp = elbowBend > 0.05;

    this.processActionState('pushup', isDown, isUp, {
      downText: '下压到位',
      upText: '',
      needDeeperText: '再下压一点',
      goodText: '保持核心稳定'
    });
  },

  // 仰卧起坐检测
  analyzeSitup(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    if (!this.checkKeypoints([leftShoulder, rightShoulder, leftHip, rightHip])) {
      this.setData({ guideText: '请确保身体在画面中' });
      return;
    }

    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;

    const torsoAngle = avgShoulderY - avgHipY;

    const isUp = torsoAngle < 0.1;
    const isDown = torsoAngle > 0.2;

    this.processActionState('situp', isUp, isDown, {
      downText: '起身',
      upText: '',
      needDeeperText: '再往上一点',
      goodText: '很好'
    });
  },

  // 平板支撑检测（姿势保持计时）
  analyzePlank(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    if (!this.checkKeypoints([leftShoulder, rightShoulder, leftHip, rightHip])) {
      this.setData({ guideText: '请确保身体在画面中' });
      return;
    }

    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;

    // 检查身体是否保持平直（肩-髋-踝接近一条线）
    const shoulderHipDiff = Math.abs(avgShoulderY - avgHipY);
    const hipAnkleDiff = Math.abs(avgHipY - avgAnkleY);

    const isHoldingPlank = shoulderHipDiff < 0.15 && hipAnkleDiff < 0.2;

    if (isHoldingPlank) {
      if (!this.data.isPoseHeld) {
        this.setData({ isPoseHeld: true });
        this.poseStartTime = Date.now();
      }
      const holdSeconds = Math.floor((Date.now() - this.poseStartTime) / 1000);
      this.setData({
        poseHoldTime: holdSeconds,
        aiMetricValue: holdSeconds,
        guideText: `保持中 ${holdSeconds}秒 💪`
      });
    } else {
      if (this.data.isPoseHeld && this.data.poseHoldTime > 3) {
        const newCount = this.data.aiCount + 1;
        this.setData({
          aiCount: newCount,
          guideText: `✅ 坚持了 ${this.data.poseHoldTime} 秒！`
        });
      }
      this.setData({ isPoseHeld: false, poseHoldTime: 0, aiMetricValue: 0 });
      this.poseStartTime = null;
      if (!this.data.guideText.includes('✅')) {
        this.setData({ guideText: '保持身体平直，核心收紧' });
      }
    }
  },

  // 引体向上检测
  analyzePullup(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];

    if (!this.checkKeypoints([leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist])) {
      this.setData({ guideText: '请确保上半身在画面中' });
      return;
    }

    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;

    // 引体向上时，肩膀接近手腕高度
    const pullRatio = avgWristY - avgShoulderY;

    const isUp = pullRatio > 0.05; // 拉起
    const isDown = pullRatio < -0.1; // 放下

    this.processActionState('pullup', isUp, isDown, {
      downText: '拉起来！',
      upText: '',
      needDeeperText: '下巴过杆',
      goodText: '很好！'
    });
  },

  // 弓步蹲检测
  analyzeLunge(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    if (!this.checkKeypoints([leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle])) {
      this.setData({ guideText: '请确保下半身在画面中' });
      return;
    }

    // 检测两腿前后分开程度
    const legSpreadX = Math.abs(leftAnkle.x - rightAnkle.x);
    const hipWidth = Math.abs(leftHip.x - rightHip.x);

    // 检测下蹲深度
    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;

    const isLungeDown = legSpreadX > hipWidth * 1.5 && (avgKneeY - avgHipY) > 0.05;
    const isStanding = legSpreadX < hipWidth * 1.2 && (avgKneeY - avgHipY) < 0.03;

    this.processActionState('lunge', isLungeDown, isStanding, {
      downText: '后膝接近地面',
      upText: '',
      needDeeperText: '再蹲低一点',
      goodText: '保持背部挺直'
    });
  },

  // ============ 有氧运动检测 ============

  // 开合跳检测
  analyzeJumpingJack(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];

    if (!this.checkKeypoints([leftWrist, rightWrist, leftAnkle, rightAnkle, leftShoulder, rightShoulder])) {
      this.setData({ guideText: '请确保全身在画面中' });
      return;
    }

    const armSpread = Math.abs(leftWrist.x - rightWrist.x);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const legSpread = Math.abs(leftAnkle.x - rightAnkle.x);

    const isOpen = armSpread > shoulderWidth * 2 && legSpread > shoulderWidth * 0.8;
    const isClosed = armSpread < shoulderWidth * 1.2 && legSpread < shoulderWidth * 0.5;

    this.processActionState('jumping_jack', isOpen, isClosed, {
      downText: '手脚张开',
      upText: '',
      needDeeperText: '再张开一点',
      goodText: '节奏很好'
    });
  },

  // 高抬腿检测
  analyzeHighKnees(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];

    if (!this.checkKeypoints([leftHip, rightHip, leftKnee, rightKnee])) {
      this.setData({ guideText: '请确保下半身在画面中' });
      return;
    }

    const avgHipY = (leftHip.y + rightHip.y) / 2;

    // 检测任一膝盖抬高超过髋部
    const leftKneeHigh = leftKnee.y < avgHipY;
    const rightKneeHigh = rightKnee.y < avgHipY;

    const isKneeUp = leftKneeHigh || rightKneeHigh;
    const isBothDown = !leftKneeHigh && !rightKneeHigh;

    this.processActionState('high_knees', isKneeUp, isBothDown, {
      downText: '膝盖抬高',
      upText: '',
      needDeeperText: '再高一点',
      goodText: '很好！'
    });
  },

  // 波比跳检测（简化版：站立-俯卧-站立）
  analyzeBurpee(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const nose = keypoints[0];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    if (!this.checkKeypoints([nose, leftHip, rightHip])) {
      this.setData({ guideText: '请确保全身在画面中' });
      return;
    }

    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const headHipDiff = avgHipY - nose.y;

    // 俯卧时头部和髋部接近同一水平
    const isDown = headHipDiff < 0.1;
    // 站立时头部远高于髋部
    const isUp = headHipDiff > 0.25;

    this.processActionState('burpee', isDown, isUp, {
      downText: '俯卧撑位置',
      upText: '',
      needDeeperText: '下蹲触地',
      goodText: '跳起来！'
    });
  },

  // 跳绳检测（检测跳跃）
  analyzeJumpRope(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    if (!this.checkKeypoints([leftAnkle, rightAnkle, leftHip, rightHip])) {
      this.setData({ guideText: '请确保全身在画面中' });
      return;
    }

    // 记录脚踝基准位置
    if (!this.ankleBaseline) {
      this.ankleBaseline = (leftAnkle.y + rightAnkle.y) / 2;
    }

    const currentAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
    const jumpHeight = this.ankleBaseline - currentAnkleY;

    const isJumping = jumpHeight > 0.03;
    const isLanded = jumpHeight < 0.01;

    // 更新基准线
    if (isLanded) {
      this.ankleBaseline = currentAnkleY;
    }

    this.processActionState('jump_rope', isJumping, isLanded, {
      downText: '跳起',
      upText: '',
      needDeeperText: '',
      goodText: '保持节奏'
    });
  },

  // 原地跑检测
  analyzeRunningInPlace(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    if (!this.checkKeypoints([leftKnee, rightKnee, leftHip, rightHip])) {
      this.setData({ guideText: '请确保下半身在画面中' });
      return;
    }

    const avgHipY = (leftHip.y + rightHip.y) / 2;

    // 检测膝盖交替抬起
    const leftKneeUp = (avgHipY - leftKnee.y) > 0.05;
    const rightKneeUp = (avgHipY - rightKnee.y) > 0.05;

    const isKneeUp = leftKneeUp || rightKneeUp;
    const isBothDown = !leftKneeUp && !rightKneeUp;

    this.processActionState('running', isKneeUp, isBothDown, {
      downText: '抬腿',
      upText: '',
      needDeeperText: '',
      goodText: '保持节奏'
    });
  },

  // ============ 拉伸/瑜伽检测 ============

  // 姿势保持检测（通用）
  analyzePoseHold(keypoints) {
    if (!keypoints || keypoints.length < 17) return;

    // 检测身体是否稳定（关键点变化小）
    if (!this.lastKeypoints) {
      this.lastKeypoints = keypoints;
      this.stableFrames = 0;
      this.setData({ guideText: '保持姿势稳定' });
      return;
    }

    // 计算关键点移动量
    let totalMovement = 0;
    let validPoints = 0;
    for (let i = 0; i < keypoints.length; i++) {
      if (keypoints[i] && this.lastKeypoints[i] &&
          keypoints[i].score > 0.3 && this.lastKeypoints[i].score > 0.3) {
        const dx = keypoints[i].x - this.lastKeypoints[i].x;
        const dy = keypoints[i].y - this.lastKeypoints[i].y;
        totalMovement += Math.sqrt(dx * dx + dy * dy);
        validPoints++;
      }
    }

    const avgMovement = validPoints > 0 ? totalMovement / validPoints : 0;
    this.lastKeypoints = keypoints;

    // 身体稳定
    if (avgMovement < 0.01) {
      this.stableFrames = (this.stableFrames || 0) + 1;

      if (this.stableFrames > 30) { // 约1秒稳定
        if (!this.data.isPoseHeld) {
          this.setData({ isPoseHeld: true });
          this.poseStartTime = Date.now();
        }
        const holdSeconds = Math.floor((Date.now() - this.poseStartTime) / 1000);
        this.setData({
          poseHoldTime: holdSeconds,
          aiMetricValue: holdSeconds,
          guideText: `保持中 ${holdSeconds}秒 🧘`
        });
      } else {
        this.setData({ guideText: '保持姿势...' });
      }
    } else {
      this.stableFrames = 0;
      if (this.data.isPoseHeld && this.data.poseHoldTime > 5) {
        this.setData({ guideText: `✅ 保持了 ${this.data.poseHoldTime} 秒` });
      } else {
        this.setData({ guideText: '调整姿势中...' });
      }
      this.setData({ isPoseHeld: false, poseHoldTime: 0, aiMetricValue: 0 });
      this.poseStartTime = null;
    }
  },

  // 检查关键点有效性
  checkKeypoints(points) {
    return points.every(p => p && p.score > 0.2);
  },

  // 处理动作状态机
  processActionState(actionType, isPhase1, isPhase2, texts) {
    if (!this.actionState) {
      this.actionState = { type: actionType, phase: 'ready', lastCount: this.data.aiCount };
    }

    if (this.actionState.phase === 'ready' && isPhase1) {
      this.actionState.phase = 'phase1';
      this.setData({ guideText: texts.downText });
    } else if (this.actionState.phase === 'phase1' && isPhase2) {
      this.actionState.phase = 'ready';
      const newCount = this.data.aiCount + 1;

      // 同时更新热量
      const currentCalories = this.calculateCalories(this.data.seconds);

      this.setData({
        aiCount: newCount,
        aiMetricValue: newCount,
        guideText: '✅ +1',
        currentCalories: currentCalories
      });

      // 震动反馈
      wx.vibrateShort({ type: 'light' }).catch(() => {});

      setTimeout(() => {
        if (this.data.aiCount === newCount) {
          this.setData({ guideText: texts.upText || '' });
        }
      }, 800);
    } else if (this.actionState.phase === 'phase1') {
      if (!isPhase1) {
        this.setData({ guideText: texts.needDeeperText || texts.goodText });
      } else {
        this.setData({ guideText: texts.goodText });
      }
    }
  },

  // ============ 摄像头事件 ============
  onCameraInit() {
    console.log('[Camera] 初始化成功');
    this.cameraReady = true;

    // 如果正在等待初始化 VisionKit，现在开始
    if (this.vkInitPending && !this.session) {
      console.log('[Camera] 摄像头就绪，开始初始化 VisionKit');
      this.setData({ guideText: '摄像头就绪，正在启动 AI...' });
      // 额外等待一小段时间确保稳定
      setTimeout(() => {
        this.initVisionKit();
      }, 300);
    }
  },

  onCameraError(e) {
    console.error('[Camera] 错误:', e);
    wx.showToast({
      title: '摄像头启动失败',
      icon: 'none'
    });
    this.switchMode();
  }
});
