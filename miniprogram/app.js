App({
  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-2go01dute64ce171', 
      traceUser: true 
    })

    console.log('云开发环境初始化完成')

    if (!wx.cloud) {
      console.error('请使用基础库2.2.3或以上版本')
      wx.showToast({ title: '云能力不可用', icon: 'none' })
    }
  },

  globalData: {
    userInfo: null,
    systemInfo: null
  }
})


