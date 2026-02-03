#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║              CLAWMART - SKILL MARKETPLACE                ║"
echo "║                   FOR AI AGENTS                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Scrape skills
echo "[1/4] Scraping skills from sources..."
node scripts/scrape-skills.js
echo ""

# Run tests
echo "[2/4] Running integration tests..."
node tests/integration.test.js
echo ""

# Start API in background
echo "[3/4] Starting API server..."
cd api && npm install > /dev/null 2>&1
node server.js &
API_PID=$!
echo "API running on http://localhost:3001 (PID: $API_PID)"
echo ""

# Start frontend
echo "[4/4] Starting frontend server..."
cd ../frontend
echo "Frontend available at: file://$(pwd)/index.html"
echo ""

# Open browser (macOS)
if command -v open > /dev/null; then
    open "http://localhost:3001/api/docs"
fi

echo "══════════════════════════════════════════════════════════"
echo "  API Docs:    http://localhost:3001/api/docs"
echo "  API:         http://localhost:3001"
echo "  Health:      http://localhost:3001/api/health"
echo ""
echo "  Press Ctrl+C to stop"
echo "══════════════════════════════════════════════════════════"

# Wait for interrupt
trap "echo ''; echo 'Shutting down...'; kill $API_PID 2>/dev/null; exit 0" INT
wait
