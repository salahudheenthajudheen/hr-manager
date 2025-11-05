#!/bin/bash

# 🔒 Pre-Deployment Security Check Script
# Run this before pushing to GitHub or deploying to Vercel

echo "🔐 Running Security Checks..."
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: .env file exists
echo "1️⃣  Checking .env file..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
else
    echo -e "${RED}✗${NC} .env file missing"
    ((ERRORS++))
fi
echo ""

# Check 2: .env is in .gitignore
echo "2️⃣  Checking .gitignore..."
if grep -q "^\.env$" .gitignore || grep -q "^\.env" .gitignore; then
    echo -e "${GREEN}✓${NC} .env is in .gitignore"
else
    echo -e "${RED}✗${NC} .env is NOT in .gitignore"
    ((ERRORS++))
fi
echo ""

# Check 3: .env is not tracked by git
echo "3️⃣  Checking git tracking..."
if git ls-files | grep -q "^\.env$"; then
    echo -e "${RED}✗${NC} .env is tracked by git (DANGEROUS!)"
    echo -e "${YELLOW}   Run: git rm --cached .env${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} .env is not tracked by git"
fi
echo ""

# Check 4: .env.example exists
echo "4️⃣  Checking .env.example..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example exists"
else
    echo -e "${YELLOW}⚠${NC} .env.example missing (recommended)"
    ((WARNINGS++))
fi
echo ""

# Check 5: Check for hardcoded secrets in code
echo "5️⃣  Scanning for hardcoded secrets..."
FOUND_SECRETS=0

# Check for potential Supabase URLs
if grep -r "https://.*\.supabase\.co" --include="*.tsx" --include="*.ts" src/ 2>/dev/null | grep -v "import.meta.env" | grep -v "VITE_SUPABASE"; then
    echo -e "${RED}✗${NC} Found hardcoded Supabase URLs"
    ((FOUND_SECRETS++))
fi

# Check for potential API keys
if grep -r "eyJ[a-zA-Z0-9]*\." --include="*.tsx" --include="*.ts" src/ 2>/dev/null | grep -v "import.meta.env"; then
    echo -e "${RED}✗${NC} Found potential hardcoded API keys"
    ((FOUND_SECRETS++))
fi

if [ $FOUND_SECRETS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No hardcoded secrets found"
else
    ((ERRORS++))
fi
echo ""

# Check 6: Verify environment variables are used correctly
echo "6️⃣  Checking environment variable usage..."
if grep -r "import\.meta\.env\.VITE_SUPABASE" --include="*.ts" src/lib/supabase.ts > /dev/null; then
    echo -e "${GREEN}✓${NC} Environment variables used correctly"
else
    echo -e "${YELLOW}⚠${NC} Could not verify environment variable usage"
    ((WARNINGS++))
fi
echo ""

# Check 7: node_modules is ignored
echo "7️⃣  Checking node_modules..."
if grep -q "node_modules" .gitignore; then
    echo -e "${GREEN}✓${NC} node_modules is in .gitignore"
else
    echo -e "${RED}✗${NC} node_modules is NOT in .gitignore"
    ((ERRORS++))
fi
echo ""

# Check 8: Verify no .env in git history
echo "8️⃣  Checking git history for .env..."
if git log --all --full-history -- .env 2>/dev/null | grep -q "commit"; then
    echo -e "${RED}✗${NC} .env found in git history (CRITICAL!)"
    echo -e "${YELLOW}   This needs to be removed from history${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✓${NC} .env not in git history"
fi
echo ""

# Summary
echo "================================"
echo "📊 Security Check Summary"
echo "================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Your code is ready to push to GitHub! 🚀"
    echo ""
    echo "Next steps:"
    echo "1. git add ."
    echo "2. git commit -m \"Initial commit\""
    echo "3. git push origin main"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ${WARNINGS} warning(s) found${NC}"
    echo ""
    echo "Warnings are non-critical but should be addressed."
    echo "Your code is safe to push to GitHub."
    exit 0
else
    echo -e "${RED}❌ ${ERRORS} error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  ${WARNINGS} warning(s) found${NC}"
    fi
    echo ""
    echo "⚠️  DO NOT push to GitHub yet!"
    echo "Please fix the errors above first."
    exit 1
fi
