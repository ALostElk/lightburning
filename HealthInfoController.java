package com.example.health_data.controller;

import com.example.health_data.entity.UserHealthInfo;
import com.example.health_data.repository.UserHealthInfoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// 标记为REST接口控制器，返回JSON数据
@RestController
// 接口统一前缀
@RequestMapping("/api/health")
public class HealthInfoController {

    // 自动注入Repository实例
    @Autowired
    private UserHealthInfoRepository healthInfoRepository;

    // 1. 新增/编辑用户信息（POST请求）
    @PostMapping("/save")
    public UserHealthInfo saveInfo(@RequestBody UserHealthInfo info) {
        return healthInfoRepository.save(info); // 自动保存到数据库
    }

    // 2. 查询所有用户信息（GET请求）
    @GetMapping("/list")
    public List<UserHealthInfo> getAllInfo() {
        return healthInfoRepository.findAll();
    }

    // 3. 根据ID查询单条信息（GET请求）
    @GetMapping("/{id}")
    public UserHealthInfo getInfoById(@PathVariable Long id) {
        return healthInfoRepository.findById(id).orElse(null);
    }
}