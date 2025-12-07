/**
 * 主程序逻辑
 * 处理页面交互和事件
 */

// ============ 页面导航 ============

// 页面切换事件监听
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const page = e.target.dataset.page;
        switchPage(page);
    });
});

// 切换页面函数
function switchPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // 移除所有导航按钮的active类
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 显示选中的页面
    document.getElementById(pageName).classList.add('active');

    // 标记导航按钮为active
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // 页面初始化
    if (pageName === 'profile') {
        initProfilePage();
    } else if (pageName === 'generate') {
        initGeneratePage();
    } else if (pageName === 'details') {
        initDetailsPage();
    }
}

// ============ 个人信息页面 ============

function initProfilePage() {
    loadProfileData();
    updateBMIDisplay();
}

// 加载已保存的个人信息
function loadProfileData() {
    const userInfo = Storage.getUserInfo();
    if (userInfo) {
        document.getElementById('username').value = userInfo.username || '';
        document.getElementById('age').value = userInfo.age || '';
        document.getElementById('gender').value = userInfo.gender || '';
        document.getElementById('height').value = userInfo.height || '';
        document.getElementById('weight').value = userInfo.weight || '';
        document.getElementById('targetWeight').value = userInfo.targetWeight || '';
        document.getElementById('fitness_level').value = userInfo.fitness_level || '';
        document.getElementById('health_conditions').value = userInfo.health_conditions || '';
        document.getElementById('daily_calorie_target').value = userInfo.daily_calorie_target || '';

        // 恢复选中的运动项目
        if (userInfo.exercises) {
            document.querySelectorAll('input[name="exercise"]').forEach(checkbox => {
                checkbox.checked = userInfo.exercises.includes(checkbox.value);
            });
        }
    }
}

// 提交个人信息表单
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 收集表单数据
    const formData = {
        username: document.getElementById('username').value,
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        height: parseInt(document.getElementById('height').value),
        weight: parseFloat(document.getElementById('weight').value),
        targetWeight: parseFloat(document.getElementById('targetWeight').value),
        fitness_level: document.getElementById('fitness_level').value,
        health_conditions: document.getElementById('health_conditions').value,
        daily_calorie_target: parseInt(document.getElementById('daily_calorie_target').value),
        exercises: Array.from(document.querySelectorAll('input[name="exercise"]:checked'))
            .map(cb => cb.value)
    };

    // 验证数据
    const validation = Validator.validateProfile(formData);
    const messageDiv = document.getElementById('profileMessage');

    if (!validation.isValid) {
        messageDiv.className = 'message error';
        messageDiv.textContent = validation.errors.join('\n');
        return;
    }

    try {
        messageDiv.className = 'message info';
        messageDiv.textContent = '正在保存个人信息...';

        // 保存到本地
        Storage.saveUserInfo(formData);

        // 发送到后端
        const response = await saveUserProfile(formData);

        messageDiv.className = 'message success';
        messageDiv.textContent = '✓ 个人信息已保存成功！';

        // 更新BMI显示
        updateBMIDisplay();

        console.log('Profile saved:', response);
    } catch (error) {
        messageDiv.className = 'message error';
        messageDiv.textContent = '✗ 保存失败：' + error.message;
        console.error(error);
    }
});

// 更新BMI显示
function updateBMIDisplay() {
    const height = parseInt(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const targetWeight = parseFloat(document.getElementById('targetWeight').value);

    if (height > 0 && weight > 0) {
        const bmi = Validator.calculateBMI(height, weight);
        const status = Validator.getBMIStatus(bmi);
        const weightDiff = Validator.calculateWeightDiff(weight, targetWeight);

        document.getElementById('bmiValue').textContent = bmi;
        document.getElementById('bmiStatus').textContent = status;
        document.getElementById('weightDiff').textContent = weightDiff;
    }
}

// 实时更新BMI
document.getElementById('height').addEventListener('input', updateBMIDisplay);
document.getElementById('weight').addEventListener('input', updateBMIDisplay);
document.getElementById('targetWeight').addEventListener('input', updateBMIDisplay);

// ============ 生成计划页面 ============

function initGeneratePage() {
    loadLongTermPlan();
    setupGeneratePlanButton();
}

// 加载长期计划
function loadLongTermPlan() {
    const plan = Storage.getLongTermPlan();
    const planContent = document.getElementById('planContent');

    if (plan) {
        planContent.innerHTML = formatPlanContent(plan);
        document.getElementById('getPlanBtn').style.display = 'inline-block';
    } else {
        planContent.innerHTML = '<p class="placeholder">请先完成个人信息设置，然后点击"生成计划"按钮</p>';
        document.getElementById('getPlanBtn').style.display = 'none';
    }
}

// 格式化计划内容显示
function formatPlanContent(plan) {
    if (typeof plan === 'string') {
        return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(plan)}</pre>`;
    }

    if (plan.content) {
        return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(plan.content)}</pre>`;
    }

    return `<pre style="white-space: pre-wrap; word-wrap: break-word;">${JSON.stringify(plan, null, 2)}</pre>`;
}

// HTML转义
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// 生成计划按钮事件
function setupGeneratePlanButton() {
    const generateBtn = document.getElementById('generatePlanBtn');
    generateBtn.addEventListener('click', async () => {
        const userInfo = Storage.getUserInfo();

        if (!userInfo) {
            alert('请先完成个人信息设置！');
            switchPage('profile');
            return;
        }

        try {
            const loadingSpinner = document.getElementById('loadingSpinner');
            const generateMessage = document.getElementById('generateMessage');
            const planContent = document.getElementById('planContent');

            loadingSpinner.style.display = 'flex';
            generateMessage.className = 'message info';
            generateMessage.textContent = '正在生成计划...';

            // 调用后端API生成计划
            const response = await getLongTermPlan();

            // 保存计划到本地
            Storage.saveLongTermPlan(response.plan || response);

            loadingSpinner.style.display = 'none';
            generateMessage.className = 'message success';
            generateMessage.textContent = '✓ 计划生成成功！';

            // 更新显示
            planContent.innerHTML = formatPlanContent(response.plan || response);
            document.getElementById('getPlanBtn').style.display = 'inline-block';

            console.log('Plan generated:', response);

            // 2秒后自动跳转到详情页
            setTimeout(() => {
                switchPage('details');
            }, 2000);
        } catch (error) {
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('generateMessage').className = 'message error';
            document.getElementById('generateMessage').textContent = '✗ 生成失败：' + error.message;
            console.error(error);
        }
    });
}

// ============ 计划详情页面 ============

function initDetailsPage() {
    displayPlanDetails();
}

// 显示计划详情
function displayPlanDetails() {
    const plan = Storage.getLongTermPlan();
    const detailsContainer = document.getElementById('planDetails');

    if (!plan) {
        detailsContainer.innerHTML = '<p class="placeholder">暂无计划详情，请先生成计划</p>';
        return;
    }

    // 如果计划是字符串，直接显示
    if (typeof plan === 'string') {
        detailsContainer.innerHTML = `
            <div class="plan-item">
                <h4>📋 您的运动计划</h4>
                <p style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(plan)}</p>
            </div>
        `;
        return;
    }

    // 如果计划有content字段
    if (plan.content) {
        detailsContainer.innerHTML = `
            <div class="plan-item">
                <h4>📋 您的运动计划</h4>
                <p style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(plan.content)}</p>
            </div>
        `;
        return;
    }

    // 否则生成详细的计划卡片
    const userInfo = Storage.getUserInfo();
    let html = `
        <div class="plan-item">
            <h4>🎯 个人概览</h4>
            <p><span class="plan-item-label">姓名：</span>${escapeHtml(userInfo.username)}</p>
            <p><span class="plan-item-label">年龄：</span>${userInfo.age}岁</p>
            <p><span class="plan-item-label">BMI：</span>${Validator.calculateBMI(userInfo.height, userInfo.weight)}</p>
            <p><span class="plan-item-label">目标：</span>从${userInfo.weight}kg减至${userInfo.targetWeight}kg</p>
        </div>
    `;

    if (plan.weeks) {
        plan.weeks.forEach((week, index) => {
            html += `
                <div class="plan-item">
                    <h4>📅 第${index + 1}周计划</h4>
                    <p>${escapeHtml(week.description || JSON.stringify(week))}</p>
                </div>
            `;
        });
    }

    detailsContainer.innerHTML = html || '<p class="placeholder">计划详情加载中...</p>';
}

// ============ 页面加载完成 ============

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    console.log('应用已加载');
    switchPage('profile');
});

// 定期保存到本地（防止数据丢失）
setInterval(() => {
    const userInfo = Storage.getUserInfo();
    if (userInfo) {
        // 自动保存已修改的表单数据
        const currentData = {
            username: document.getElementById('username').value,
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            height: parseInt(document.getElementById('height').value),
            weight: parseFloat(document.getElementById('weight').value),
            targetWeight: parseFloat(document.getElementById('targetWeight').value),
            fitness_level: document.getElementById('fitness_level').value,
            daily_calorie_target: parseInt(document.getElementById('daily_calorie_target').value),
            exercises: Array.from(document.querySelectorAll('input[name="exercise"]:checked'))
                .map(cb => cb.value)
        };

        const validation = Validator.validateProfile(currentData);
        if (validation.isValid && document.getElementById('profile').classList.contains('active')) {
            // 只有在有效且在个人信息页面时才自动保存
            // 这里可以选择自动保存，或者只在表单提交时保存
        }
    }
}, 30000); // 每30秒检查一次
