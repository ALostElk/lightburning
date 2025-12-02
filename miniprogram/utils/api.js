// utils/api.js

/**
 * 生成热量计划
 * @param {number} targetWeight 目标体重变化(kg)
 * @param {string} startDate 开始日期 '2023-11-01'
 * @param {string} endDate 结束日期 '2024-02-01'
 */
export const generatePlan = async (targetWeight, startDate, endDate) => {
  const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  
  return wx.cloud.callFunction({
    name: 'jobService',
    data: {
      action: 'generatePlan',
      data: { targetWeight, totalDays }
    }
  });
};

/**
 * 调整热量计划
 * @param {number} dailyGoal 每日目标
 * @param {Array} historyRecords 历史记录
 */
export const adjustPlan = async (dailyGoal, historyRecords = []) => {
  return wx.cloud.callFunction({
    name: 'jobService', 
    data: {
      action: 'adjustPlan',
      data: { dailyGoal, historyRecords }
    }
  });
};