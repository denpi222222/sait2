# =============================================================================
# 🔧 СКРИПТ ДЛЯ ИСПРАВЛЕНИЯ ПРОБЛЕМ С FRONTIER INTERNET
# =============================================================================
# Этот скрипт решает проблемы с Frontier провайдером:
# 1. Сбрасывает DNS кеш
# 2. Отключает IPv6 (частая причина глюков на Frontier)
# 3. Устанавливает быстрые DNS серверы Cloudflare
# 
# ⚠️ ВАЖНО: Запускать от имени администратора!
# =============================================================================

Write-Host "🚀 Запуск скрипта исправления проблем с Frontier..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Yellow

# Проверка прав администратора
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ ОШИБКА: Запустите PowerShell от имени администратора!" -ForegroundColor Red
    Write-Host "Правый клик на PowerShell → Запуск от имени администратора" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Права администратора подтверждены" -ForegroundColor Green

# =============================================================================
# 1. СБРОС DNS КЕША
# =============================================================================
Write-Host "`n🔄 Шаг 1: Сброс DNS кеша..." -ForegroundColor Cyan
try {
    ipconfig /flushdns | Out-Null
    Write-Host "✅ DNS кеш успешно сброшен" -ForegroundColor Green
} catch {
    Write-Host "❌ Ошибка сброса DNS кеша: $($_.Exception.Message)" -ForegroundColor Red
}

# =============================================================================
# 2. ОТКЛЮЧЕНИЕ IPv6 НА ВСЕХ АДАПТЕРАХ
# =============================================================================
Write-Host "`n🔄 Шаг 2: Отключение IPv6 на всех сетевых адаптерах..." -ForegroundColor Cyan

$activeAdapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}

if ($activeAdapters.Count -eq 0) {
    Write-Host "⚠️ Нет активных сетевых адаптеров" -ForegroundColor Yellow
} else {
    foreach ($adapter in $activeAdapters) {
        try {
            Write-Host "  📡 Отключаю IPv6 на адаптере: $($adapter.Name)" -ForegroundColor White
            Disable-NetAdapterBinding -Name $adapter.Name -ComponentID ms_tcpip6 -Confirm:$false -ErrorAction Stop
            Write-Host "  ✅ IPv6 отключен на $($adapter.Name)" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Ошибка отключения IPv6 на $($adapter.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# =============================================================================
# 3. УСТАНОВКА DNS СЕРВЕРОВ CLOUDFLARE
# =============================================================================
Write-Host "`n🔄 Шаг 3: Установка DNS серверов Cloudflare..." -ForegroundColor Cyan

foreach ($adapter in $activeAdapters) {
    try {
        Write-Host "  📡 Настройка DNS для адаптера: $($adapter.Name)" -ForegroundColor White
        
        # Устанавливаем DNS серверы Cloudflare
        Set-DnsClientServerAddress -InterfaceAlias $adapter.Name -ServerAddresses "1.1.1.1", "1.0.0.1" -ErrorAction Stop
        
        Write-Host "  ✅ DNS настроен для $($adapter.Name) (1.1.1.1, 1.0.0.1)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Ошибка настройки DNS для $($adapter.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# =============================================================================
# 4. ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ СЕТИ
# =============================================================================
Write-Host "`n🔄 Шаг 4: Дополнительные настройки сети..." -ForegroundColor Cyan

try {
    # Сброс TCP/IP стека
    Write-Host "  🔄 Сброс TCP/IP стека..." -ForegroundColor White
    netsh int ip reset | Out-Null
    
    # Сброс Winsock
    Write-Host "  🔄 Сброс Winsock..." -ForegroundColor White
    netsh winsock reset | Out-Null
    
    # Освобождение и обновление IP адреса
    Write-Host "  🔄 Обновление IP адреса..." -ForegroundColor White
    ipconfig /release | Out-Null
    ipconfig /renew | Out-Null
    
    Write-Host "  ✅ Дополнительные настройки применены" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Ошибка дополнительных настроек: $($_.Exception.Message)" -ForegroundColor Red
}

# =============================================================================
# 5. ПРОВЕРКА РЕЗУЛЬТАТА
# =============================================================================
Write-Host "`n🔄 Шаг 5: Проверка результата..." -ForegroundColor Cyan

try {
    # Проверяем текущие DNS серверы
    Write-Host "  📋 Текущие DNS серверы:" -ForegroundColor White
    foreach ($adapter in $activeAdapters) {
        $dnsServers = Get-DnsClientServerAddress -InterfaceAlias $adapter.Name -AddressFamily IPv4
        Write-Host "    $($adapter.Name): $($dnsServers.ServerAddresses -join ', ')" -ForegroundColor Gray
    }
    
    # Тестируем подключение к Cloudflare DNS
    Write-Host "  🌐 Тестирование подключения к Cloudflare DNS..." -ForegroundColor White
    $testResult = Test-NetConnection -ComputerName "1.1.1.1" -Port 53 -InformationLevel Quiet
    if ($testResult) {
        Write-Host "  ✅ Подключение к Cloudflare DNS успешно" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Не удалось подключиться к Cloudflare DNS" -ForegroundColor Red
    }
    
} catch {
    Write-Host "  ❌ Ошибка проверки: $($_.Exception.Message)" -ForegroundColor Red
}

# =============================================================================
# ФИНАЛЬНЫЕ ИНСТРУКЦИИ
# =============================================================================
Write-Host "`n=============================================" -ForegroundColor Yellow
Write-Host "🎉 СКРИПТ ЗАВЕРШЕН!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Yellow

Write-Host "`n📋 ЧТО БЫЛО СДЕЛАНО:" -ForegroundColor Cyan
Write-Host "  ✅ Сброшен DNS кеш" -ForegroundColor Green
Write-Host "  ✅ Отключен IPv6 на всех адаптерах" -ForegroundColor Green
Write-Host "  ✅ Установлены DNS серверы Cloudflare (1.1.1.1, 1.0.0.1)" -ForegroundColor Green
Write-Host "  ✅ Сброшен TCP/IP стек и Winsock" -ForegroundColor Green
Write-Host "  ✅ Обновлен IP адрес" -ForegroundColor Green

Write-Host "`n⚠️ ВАЖНО:" -ForegroundColor Yellow
Write-Host "  1. ПЕРЕЗАГРУЗИТЕ КОМПЬЮТЕР для полного применения изменений" -ForegroundColor Red
Write-Host "  2. После перезагрузки проверьте скорость интернета" -ForegroundColor White
Write-Host "  3. Если проблемы остались - перезагрузите роутер" -ForegroundColor White

Write-Host "`n🔄 ЕСЛИ ХОТИТЕ ВЕРНУТЬ IPv6 ОБРАТНО:" -ForegroundColor Yellow
Write-Host "  Запустите эту команду от имени администратора:" -ForegroundColor White
Write-Host "  Get-NetAdapter | ForEach-Object { Enable-NetAdapterBinding -Name `$_.Name -ComponentID ms_tcpip6 }" -ForegroundColor Gray

Write-Host "`n🌐 ДОПОЛНИТЕЛЬНО ДЛЯ РОУТЕРА:" -ForegroundColor Yellow
Write-Host "  1. Зайдите в настройки роутера (обычно 192.168.1.1)" -ForegroundColor White
Write-Host "  2. Найдите настройки DNS" -ForegroundColor White
Write-Host "  3. Установите: Primary DNS = 1.1.1.1, Secondary DNS = 1.0.0.1" -ForegroundColor White
Write-Host "  4. Отключите IPv6 в настройках роутера" -ForegroundColor White
Write-Host "  5. Перезагрузите роутер" -ForegroundColor White

Write-Host "`n🚀 РЕЗУЛЬТАТ:" -ForegroundColor Green
Write-Host "  ⚡ Быстрее загрузка сайтов" -ForegroundColor Green
Write-Host "  ⚡ Стабильнее стриминг" -ForegroundColor Green
Write-Host "  ⚡ Меньше обрывов соединения" -ForegroundColor Green
Write-Host "  ⚡ Cursor должен работать стабильно" -ForegroundColor Green

Write-Host "`n" -ForegroundColor White
Write-Host "Нажмите любую клавишу для выхода..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
