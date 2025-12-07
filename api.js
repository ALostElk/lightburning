/**
 * API 请求处理模块
 * 与后端 server.js 通信
 */

const API_BASE_URL = 'http://localhost:3000/api';

// 生成唯一的用户ID（本地存储）
function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

/**
 * 保存用户个人信息并生成长期计划
 */
async function saveUserProfile(profileData) {
    try {
        const userId = getUserId();
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                ...profileData
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error saving profile:', error);
        throw error;
    }
}

/**
 * 获取用户的长期运动计划
 */
async function getLongTermPlan() {
    try {
        const userId = getUserId();
        const response = await fetch(`${API_BASE_URL}/plan/longterm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching long term plan:', error);
        throw error;
    }
}

/**
 * 根据热量差生成每日运动计划
 */
async function generateDailyPlan(calorieDeficit, date = null) {
    try {
        const userId = getUserId();
        const response = await fetch(`${API_BASE_URL}/plan/daily`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                calorieDeficit,
                date: date || new Date().toISOString().split('T')[0]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error generating daily plan:', error);
        throw error;
    }
}

/**
 * 调用智能体获取运动建议
 */
async function getAgentAdvice(prompt) {
    try {
        const userId = getUserId();
        const response = await fetch(`${API_BASE_URL}/agent/advise`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                prompt
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting agent advice:', error);
        throw error;
    }
}

/**
 * 本地存储管理
 */
const Storage = {
    // 保存用户信息到本地
    saveUserInfo(userData) {
        localStorage.setItem('userProfile', JSON.stringify(userData));
    },

    // 从本地读取用户信息
    getUserInfo() {
        const data = localStorage.getItem('userProfile');
        return data ? JSON.parse(data) : null;
    },

    // 保存长期计划
    saveLongTermPlan(plan) {
        localStorage.setItem('longTermPlan', JSON.stringify(plan));
    },

    // 读取长期计划
    getLongTermPlan() {
        const data = localStorage.getItem('longTermPlan');
        return data ? JSON.parse(data) : null;
    },

    // 保存每日计划
    saveDailyPlan(plan) {
        localStorage.setItem('dailyPlan', JSON.stringify(plan));
    },

    // 读取每日计划
    getDailyPlan() {
        const data = localStorage.getItem('dailyPlan');
        return data ? JSON.parse(data) : null;
    },

    // 清除所有数据
    clearAll() {
        localStorage.clear();
    }
};

/**
 * 数据验证工具
 */
const Validator = {
    // 验证个人信息
    validateProfile(data) {
        const errors = [];

        if (!data.username || data.username.trim().length === 0) {
            errors.push('昵称不能为空');
        }

        if (!data.age || data.age < 10 || data.age > 100) {
            errors.push('年龄必须在10-100之间');
        }

        if (!data.gender) {
            errors.push('性别不能为空');
        }

        if (!data.height || data.height < 100 || data.height > 250) {
            errors.push('身高必须在100-250cm之间');
        }

        if (!data.weight || data.weight < 20 || data.weight > 300) {
            errors.push('体重必须在20-300kg之间');
        }

        if (!data.targetWeight || data.targetWeight < 20 || data.targetWeight > 300) {
            errors.push('目标体重必须在20-300kg之间');
        }

        if (!data.fitness_level) {
            errors.push('健身水平不能为空');
        }

        if (!data.daily_calorie_target) {
            errors.push('每日卡路里目标不能为空');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // 计算BMI
    calculateBMI(height, weight) {
        const heightInMeters = height / 100;
        return (weight / (heightInMeters * heightInMeters)).toFixed(1);
    },

    // 获取BMI状态
    getBMIStatus(bmi) {
        bmi = parseFloat(bmi);
        if (bmi < 18.5) return '偏瘦';
        if (bmi < 25) return '正常';
        if (bmi < 30) return '超重';
        return '肥胖';
    },

    // 计算需要减重的公斤数
    calculateWeightDiff(currentWeight, targetWeight) {
        const diff = currentWeight - targetWeight;
        return diff > 0 ? `${diff.toFixed(1)} kg` : `增重 ${Math.abs(diff).toFixed(1)} kg`;
    }
};
