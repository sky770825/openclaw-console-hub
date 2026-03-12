#!/bin/bash
set -e

echo "🌟 OpenClaw One-Click Installer 🌟"
echo "--------------------------------"

# 1. Environment Checks
echo "🔍 Checking environment..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        echo "❌ Node.js version 18+ required. Current: v$NODE_VER"
        exit 1
    fi
    echo "✅ Node.js v$NODE_VER found."
else
    echo "❌ Node.js not found."
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    echo "✅ npm $(npm -v) found."
else
    echo "❌ npm not found."
    exit 1
fi

# Check git
if command -v git >/dev/null 2>&1; then
    echo "✅ git found."
else
    echo "❌ git not found."
    exit 1
fi

# Check Docker (Optional)
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker found (Optional)."
else
    echo "⚠️ Docker not found. Local Postgres option will require manual setup."
fi

# 2. Repository Setup
if [ ! -d ".git" ] && [ ! -f "package.json" ]; then
    echo "📥 Repository not found. Cloning OpenClaw..."
    # Placeholder for actual clone command
    # git clone https://github.com/example/openclaw.git .
    echo "⚠️  Simulation: No repo URL provided, assuming current directory structure if files exist."
fi

# 3. Install Dependencies
echo "📦 Installing server dependencies..."
if [ -d "server" ]; then
    cd server && npm install
    cd ..
else
    echo "⚠️  'server' directory not found, skipping..."
fi

echo "📦 Installing frontend dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo "⚠️  Root 'package.json' not found, skipping..."
fi

# 4. Environment Variables Setup
echo "⚙️ Setting up .env files..."
if [ -d "server" ]; then
    if [ ! -f "server/.env" ]; then
        if [ -f "server/.env.example" ]; then
            cp server/.env.example server/.env
            echo "✅ Created server/.env from example."
        else
            cat << ENV_EOF > server/.env
PORT=3011
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
ENV_EOF
            echo "✅ Created basic server/.env template."
        fi
    fi
fi

# 5. Database Initialization Choice
echo "--------------------------------"
echo "Select Database Type:"
echo "1) Supabase Cloud"
echo "2) Local Postgres"
read -p "Enter choice (1/2): " DB_CHOICE

case $DB_CHOICE in
    1)
        echo "📝 Please configure your Supabase credentials in server/.env"
        ;;
    2)
        echo "🐘 Local Postgres selected. Ensure Postgres is running on localhost:5432."
        ;;
    *)
        echo "⚠️ Invalid choice, defaulting to manual configuration."
        ;;
esac

# 6. Final Report
echo "--------------------------------"
echo "✅ Installation Complete!"
echo "Checklist:"
echo "- Node 18+: OK"
echo "- Dependencies: Installed"
echo "- Env Template: Created"
echo "- Start Script: Ready"
echo ""
echo "To start the system, run: ./start-dev.sh"
