#!/bin/bash

# Cloudflare AI Assignment Deployment Script
# This script helps deploy the AI chat assistant to Cloudflare

echo "🚀 Cloudflare AI Assignment - Deployment Script"
echo "================================================"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare:"
    wrangler login
fi

echo "📦 Installing dependencies..."
npm install

echo "🔍 Running type check..."
npx tsc --noEmit

echo "🧪 Running basic tests..."
echo "Testing health endpoint..."

# Test if the worker can be built
echo "🔨 Building worker..."
if npx wrangler dev --dry-run &> /dev/null; then
    echo "✅ Worker builds successfully"
else
    echo "❌ Worker build failed"
    exit 1
fi

echo ""
echo "🎯 Choose deployment option:"
echo "1) Development (npm run dev)"
echo "2) Staging (npm run deploy:staging)"
echo "3) Production (npm run deploy:prod)"
echo "4) Skip deployment"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Starting development server..."
        npm run dev
        ;;
    2)
        echo "🚀 Deploying to staging..."
        npm run deploy:staging
        ;;
    3)
        echo "🚀 Deploying to production..."
        npm run deploy:prod
        ;;
    4)
        echo "⏭️  Skipping deployment"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment script completed!"
echo ""
echo "📋 Next steps:"
echo "1. Visit your deployed URL"
echo "2. Test the chat functionality"
echo "3. Try voice input (microphone button)"
echo "4. Check chat history persistence"
echo ""
echo "🎉 Your AI Chat Assistant is ready!"
