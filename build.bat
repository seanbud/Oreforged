@echo off
echo ==========================================
echo Building OreForged
echo ==========================================

echo.
echo [1/2] Building UI...
cd ui
call pnpm install
if %errorlevel% neq 0 (
    echo Failed to install UI dependencies. Please ensure Node.js and pnpm are installed.
    pause
    exit /b %errorlevel%
)
call pnpm run build
if %errorlevel% neq 0 (
    echo Failed to build UI.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/2] Building C++ Game...
mkdir build
cd build
cmake ..
if %errorlevel% neq 0 (
    echo Failed to configure CMake. Please ensure CMake is installed.
    pause
    exit /b %errorlevel%
)
cmake --build . --config Release
if %errorlevel% neq 0 (
    echo Failed to build C++ project.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo ==========================================
echo Build Complete!
echo Run the game: build\bin\Release\OreForged.exe
echo ==========================================
pause
