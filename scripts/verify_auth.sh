#!/bin/bash
BASE_URL="http://localhost:3001"

echo "1. Registering a Shop Manager..."
curl -s -X POST $BASE_URL/register -d '{"username":"salon_owner","password":"password123","email":"owner@example.com","role":"SHOP_MANAGER"}'

echo -e "\n2. Logging in as Shop Manager..."
LOGIN_RES=$(curl -s -X POST $BASE_URL/login -d '{"username":"salon_owner","password":"password123"}')
TOKEN=$(echo $LOGIN_RES | jq -r '.token')
echo "Token received: ${TOKEN:0:20}..."

echo -e "\n3. Accessing Shop Management (Should succeed)..."
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/shop/manage

echo -e "\n4. Accessing Admin Dashboard (Should fail - 403)..."
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/admin/dashboard

echo -e "\n5. Testing Forgot Password..."
curl -s -X POST $BASE_URL/forgot-password -d '{"email":"owner@example.com"}'

echo -e "\n6. Verifying Profile..."
curl -s -H "Authorization: Bearer $TOKEN" $BASE_URL/profile
echo -e "\n"
