#!/bin/bash
echo "Checking Development Environment for Beauty Web Project..."
node -v | grep -q "v" && echo "✅ Node.js installed" || echo "❌ Node.js missing"
npm -v | grep -q "." && echo "✅ NPM installed" || echo "❌ NPM missing"
docker -v | grep -q "Docker" && echo "✅ Docker installed" || echo "❌ Docker missing"
