Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell -NoProfile -ExecutionPolicy Bypass -Command ""cd 'e:\Code\byteforge'; pnpm dev""", 0, False
