# 批量安装云函数依赖脚本
Write-Host "开始安装云函数依赖..." -ForegroundColor Green

$cloudFunctions = @(
    "dietService",
    "healthService", 
    "qwenAI",
    "foodRecognitionQwen"
)

foreach ($func in $cloudFunctions) {
    Write-Host "`n正在安装 $func 依赖..." -ForegroundColor Cyan
    
    $path = "cloudfunctions\$func"
    
    if (Test-Path $path) {
        Push-Location $path
        
        if (Test-Path "package.json") {
            npm install
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ $func 依赖安装成功" -ForegroundColor Green
            } else {
                Write-Host "✗ $func 依赖安装失败" -ForegroundColor Red
            }
        } else {
            Write-Host "! $func 没有 package.json 文件" -ForegroundColor Yellow
        }
        
        Pop-Location
    } else {
        Write-Host "! 未找到 $func 目录" -ForegroundColor Yellow
    }
}

Write-Host "`n所有云函数依赖安装完成！" -ForegroundColor Green
Write-Host "提示：请在微信开发者工具中上传并部署云函数" -ForegroundColor Cyan

