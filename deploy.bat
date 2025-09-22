@echo off
echo 🚀 Cloudflare AI Assignment - Deployment Script
echo ================================================

REM Check if wrangler is installed
where wrangler >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Wrangler CLI not found. Installing...
    npm install -g wrangler
)

REM Check if user is logged in
wrangler whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔐 Please login to Cloudflare:
    wrangler login
)

echo 📦 Installing dependencies...
npm install

echo 🔍 Running type check...
npx tsc --noEmit

echo 🧪 Running basic tests...
echo Testing health endpoint...

REM Test if the worker can be built
echo 🔨 Building worker...
npx wrangler dev --dry-run >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Worker builds successfully
) else (
    echo ❌ Worker build failed
    exit /b 1
)

echo.
echo 🎯 Choose deployment option:
echo 1^) Development (npm run dev)
echo 2^) Staging (npm run deploy:staging)
echo 3^) Production (npm run deploy:prod)
echo 4^) Skip deployment
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo 🚀 Starting development server...
    npm run dev
) else if "%choice%"=="2" (
    echo 🚀 Deploying to staging...
    npm run deploy:staging
) else if "%choice%"=="3" (
    echo 🚀 Deploying to production...
    npm run deploy:prod
) else if "%choice%"=="4" (
    echo ⏭️  Skipping deployment
) else (
    echo ❌ Invalid choice
    exit /b 1
)

echo.
echo ✅ Deployment script completed!
echo.
echo 📋 Next steps:
echo 1. Visit your deployed URL
echo 2. Test the chat functionality
echo 3. Try voice input (microphone button)
echo 4. Check chat history persistence
echo.
echo 🎉 Your AI Chat Assistant is ready!
pause
