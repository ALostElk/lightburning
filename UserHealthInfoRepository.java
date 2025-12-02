package com.example.health_data.repository;

import com.example.health_data.entity.UserHealthInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// 标记为数据访问组件，Spring自动实现增删改查方法
@Repository
public interface UserHealthInfoRepository extends JpaRepository<UserHealthInfo, Long> {
    // JpaRepository自带save/findById/findAll等方法，无需额外编写
}