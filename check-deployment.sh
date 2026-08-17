#!/bin/bash
# Quick deployment verification script

echo "🔍 Checking deployment prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi
echo "✅ Node.js: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
echo "✅ npm: $(npm --version)"

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi
echo "✅ Git: $(git --version)"

# Check .env file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
fi
echo "✅ .env file exists"

# Check DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo "❌ DATABASE_URL not in .env file"
    exit 1
fi
echo "✅ DATABASE_URL configured"

# Check package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi
echo "✅ package.json found"

# Check if node_modules needs installation
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✅ All checks passed! Ready to deploy."
echo ""
echo "📋 Next steps:"
echo "1. Test locally: npm run dev"
echo "2. Push to GitHub: git push origin main"
echo "3. Deploy to Render at https://render.com"
echo "4. Add DATABASE_URL to Render environment variables"
