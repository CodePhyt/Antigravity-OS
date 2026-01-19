#!/bin/bash

# Antigravity OS - Post-Execution Validation Script
# This script runs after every agent execution to validate code quality
# Part of the autonomous B.L.A.S.T. loop

set -e  # Exit on first error

echo "🔍 Starting Post-Execution Validation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Track validation results
VALIDATION_PASSED=true
ERRORS=()

# 1. TypeScript Compilation Check
echo ""
echo "📝 Step 1: TypeScript Compilation"
echo "   Checking for type errors..."
if npm run type-check 2>&1 | tee /tmp/typecheck.log; then
    echo "   ✅ TypeScript compilation passed"
else
    echo "   ❌ TypeScript compilation failed"
    VALIDATION_PASSED=false
    ERRORS+=("TypeScript compilation errors detected")
fi

# 2. ESLint Check
echo ""
echo "🔍 Step 2: ESLint Validation"
echo "   Checking code quality..."
if npm run lint 2>&1 | tee /tmp/lint.log; then
    echo "   ✅ ESLint validation passed"
else
    echo "   ❌ ESLint validation failed"
    VALIDATION_PASSED=false
    ERRORS+=("ESLint errors detected")
fi

# 3. Unit Tests
echo ""
echo "🧪 Step 3: Unit Tests"
echo "   Running test suite..."
if npm test 2>&1 | tee /tmp/test.log; then
    echo "   ✅ All tests passed"
else
    echo "   ❌ Tests failed"
    VALIDATION_PASSED=false
    ERRORS+=("Test failures detected")
fi

# 4. JSON Schema Validation
echo ""
echo "📋 Step 4: JSON Schema Validation"
echo "   Validating schemas..."
if [ -d "docs/schemas" ]; then
    # Check if all schema files are valid JSON
    for schema in docs/schemas/*.json; do
        if [ -f "$schema" ]; then
            if jq empty "$schema" 2>/dev/null; then
                echo "   ✅ $(basename $schema) is valid"
            else
                echo "   ❌ $(basename $schema) is invalid"
                VALIDATION_PASSED=false
                ERRORS+=("Invalid JSON schema: $(basename $schema)")
            fi
        fi
    done
else
    echo "   ⚠️  No schemas directory found"
fi

# 5. Spec File Validation
echo ""
echo "📄 Step 5: Spec File Validation"
echo "   Checking spec files..."
if [ -d ".kiro/specs" ]; then
    for spec_dir in .kiro/specs/*/; do
        if [ -d "$spec_dir" ]; then
            spec_name=$(basename "$spec_dir")
            echo "   Checking $spec_name..."
            
            # Check for required files
            if [ ! -f "$spec_dir/requirements.md" ]; then
                echo "   ❌ Missing requirements.md in $spec_name"
                VALIDATION_PASSED=false
                ERRORS+=("Missing requirements.md in $spec_name")
            fi
            
            if [ ! -f "$spec_dir/design.md" ]; then
                echo "   ❌ Missing design.md in $spec_name"
                VALIDATION_PASSED=false
                ERRORS+=("Missing design.md in $spec_name")
            fi
            
            if [ ! -f "$spec_dir/tasks.md" ]; then
                echo "   ❌ Missing tasks.md in $spec_name"
                VALIDATION_PASSED=false
                ERRORS+=("Missing tasks.md in $spec_name")
            fi
        fi
    done
    echo "   ✅ Spec file structure validated"
else
    echo "   ⚠️  No specs directory found"
fi

# 6. Steering File Validation
echo ""
echo "🎯 Step 6: Steering File Validation"
echo "   Checking steering files..."
if [ -d ".kiro/steering" ]; then
    required_steering=(
        "antigravity-protocol.md"
        "global_rules.md"
        "checkpoint_rules.md"
        "n8n_integration.md"
    )
    
    for file in "${required_steering[@]}"; do
        if [ -f ".kiro/steering/$file" ]; then
            echo "   ✅ $file exists"
        else
            echo "   ❌ Missing $file"
            VALIDATION_PASSED=false
            ERRORS+=("Missing steering file: $file")
        fi
    done
else
    echo "   ❌ No steering directory found"
    VALIDATION_PASSED=false
    ERRORS+=("Missing .kiro/steering directory")
fi

# Final Report
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$VALIDATION_PASSED" = true ]; then
    echo "✅ VALIDATION PASSED"
    echo ""
    echo "All checks completed successfully!"
    echo "Code is ready for commit."
    exit 0
else
    echo "❌ VALIDATION FAILED"
    echo ""
    echo "Errors detected:"
    for error in "${ERRORS[@]}"; do
        echo "  • $error"
    done
    echo ""
    echo "🔄 Triggering B.L.A.S.T. Protocol..."
    echo ""
    echo "Next steps:"
    echo "1. Review error logs in /tmp/"
    echo "2. Update specs if needed"
    echo "3. Fix code issues"
    echo "4. Re-run validation"
    echo ""
    echo "See .kiro/steering/global_rules.md for B.L.A.S.T. protocol details"
    exit 1
fi
