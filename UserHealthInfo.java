package com.example.health_data.entity; // 注意这里的包名要和你的项目路径一致（当前是health_data，不是healthdata）

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

// 标记为数据库实体类，对应数据库表
@Entity
// Lombok注解，自动生成getter、setter、构造方法等
@Data
public class UserHealthInfo {
    // 主键，数据库自动生成唯一ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1. 基础信息
    private String gender; // 性别（例如：男/女）
    private Integer age; // 年龄
    private Double height; // 身高（单位：cm）
    private Double weight; // 体重（单位：kg）

    // 2. 健康目标
    private String goalType; // 目标类型（减脂/保持体重）
    private Double targetWeight;// 目标体重（单位：kg）
    private Integer period; // 周期（单位：月）

    // 3. 活动水平
    private String activityLevel; // 活动水平（久坐/轻度活动/中度活动/非常活跃）

    // 4. 身体指标（可选）
    private Double bodyFatRate; // 体脂率
    private Double waistline; // 腰围（单位：cm）

    // 5. 健康问卷（扩展点）
    private String livingHabits; // 生活习惯（例如：早睡早起）
    private String sleepQuality; // 睡眠质量（好/中/差）
    private String stressLevel; // 压力水平（低/中/高）
    private String dietPreference; // 饮食偏好（例如：素食/不吃辣）
    private String allergens; // 过敏源（例如：海鲜）
}