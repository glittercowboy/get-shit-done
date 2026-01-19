#!/bin/bash
set -e

# =============================================================================
# Data Reply Platform - Cloud Setup Script
# =============================================================================
# Prerequisites:
#   - AWS CLI configured (aws configure)
#   - Supabase CLI installed:
#       macOS: brew install supabase/tap/supabase
#       Linux: brew install supabase/tap/supabase (or see docs)
#       Windows: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase
#   - Node.js 18+
#   - Vercel CLI installed (npm install -g vercel)
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Data Reply Platform - Cloud Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# -----------------------------------------------------------------------------
# Step 1: Check prerequisites
# -----------------------------------------------------------------------------
echo ""
echo "[1/5] Checking prerequisites..."

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "ERROR: $1 is not installed. Please install it first."
        exit 1
    fi
    echo "  ✓ $1"
}

check_command aws
check_command node
check_command npm
check_command supabase
check_command vercel

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi
echo "  ✓ AWS credentials configured"

# -----------------------------------------------------------------------------
# Step 2: Supabase Setup
# -----------------------------------------------------------------------------
echo ""
echo "[2/5] Setting up Supabase..."

if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo ""
    echo "  Please create a Supabase project at https://supabase.com"
    echo "  Then enter your project reference (from project URL):"
    echo "  Example: If URL is https://abcd1234.supabase.co, enter 'abcd1234'"
    read -p "  Project ref: " SUPABASE_PROJECT_REF
fi

# Link to Supabase project
echo "  Linking to Supabase project..."
supabase link --project-ref "$SUPABASE_PROJECT_REF"

# Run migrations
echo "  Running database migrations..."
supabase db push

echo "  ✓ Supabase configured"

# Get Supabase credentials
echo ""
echo "  Fetching Supabase credentials..."
SUPABASE_URL="https://${SUPABASE_PROJECT_REF}.supabase.co"
echo "  SUPABASE_URL: $SUPABASE_URL"
echo ""
echo "  Please enter your Supabase anon key (from Settings > API):"
read -p "  Anon key: " SUPABASE_ANON_KEY

# -----------------------------------------------------------------------------
# Step 3: AWS Infrastructure
# -----------------------------------------------------------------------------
echo ""
echo "[3/5] Deploying AWS infrastructure..."

cd infra

# Install dependencies
echo "  Installing CDK dependencies..."
npm install

# Bootstrap CDK (if needed)
echo "  Bootstrapping CDK..."
npx cdk bootstrap

# Deploy all stacks
echo "  Deploying stacks (this may take 10-15 minutes)..."
npx cdk deploy --all --require-approval never --outputs-file cdk-outputs.json

echo "  ✓ AWS infrastructure deployed"

# Extract outputs
echo "  CDK outputs saved to infra/cdk-outputs.json"

cd ..

# -----------------------------------------------------------------------------
# Step 4: Create environment file
# -----------------------------------------------------------------------------
echo ""
echo "[4/5] Creating environment configuration..."

cat > frontend/.env.production << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# AWS (from CDK outputs - update after deployment)
NEXT_PUBLIC_API_URL=\${API_GATEWAY_URL}
EOF

cat > .env << EOF
# Supabase
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# AWS Region
AWS_REGION=us-east-1
EOF

echo "  ✓ Environment files created"
echo "    - frontend/.env.production"
echo "    - .env"

# -----------------------------------------------------------------------------
# Step 5: Deploy Frontend to Vercel
# -----------------------------------------------------------------------------
echo ""
echo "[5/5] Deploying frontend to Vercel..."

cd frontend

# Install dependencies
npm install

# Deploy to Vercel
echo "  Starting Vercel deployment..."
vercel --prod

cd ..

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Services deployed:"
echo "  • Supabase: $SUPABASE_URL"
echo "  • AWS: See infra/cdk-outputs.json for endpoints"
echo "  • Vercel: Check terminal output above for URL"
echo ""
echo "Next steps:"
echo "  1. Enable Bedrock model access in AWS Console"
echo "     → Amazon Bedrock → Model access → Request Claude access"
echo ""
echo "  2. Add environment variables to Vercel dashboard"
echo "     → Project Settings → Environment Variables"
echo "     → Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo ""
echo "  3. Connect a data source and start profiling!"
echo ""
