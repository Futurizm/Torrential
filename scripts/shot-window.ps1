# Скриншот окна по заголовку (для визуальной проверки собранного приложения)
param(
  [string]$Title = 'Torrential',
  [string]$Out = '.shot.png'
)

Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

# Без этого GetWindowRect вернёт логические пиксели, а PrintWindow зальёт кадр
# в битмап физического размера — правая часть окна обрежется.
[void][Win]::SetProcessDPIAware()

$proc = Get-Process | Where-Object { $_.MainWindowTitle -eq $Title -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $proc) { Write-Output "окно '$Title' не найдено"; exit 1 }

$handle = $proc.MainWindowHandle
# Перекрытое окно Chromium рисует в PrintWindow чёрный кадр — выводим вперёд.
[void][Win]::ShowWindow($handle, 9)   # SW_RESTORE
[void][Win]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 600

$rect = New-Object Win+RECT
[void][Win]::GetWindowRect($handle, [ref]$rect)
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top

$bmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$dc = $graphics.GetHdc()
# 2 = PW_RENDERFULLCONTENT, иначе Chromium отдаёт пустой кадр
$ok = [Win]::PrintWindow($handle, $dc, 2)
$graphics.ReleaseHdc($dc)
$bmp.Save((Resolve-Path '.').Path + '\' + $Out, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $bmp.Dispose()

Write-Output "снимок окна $width x $height -> $Out (PrintWindow: $ok)"