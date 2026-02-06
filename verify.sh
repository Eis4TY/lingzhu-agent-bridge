#!/bin/bash
echo "Testing Bindings API..."
# Create
RESPONSE=$(curl -s -X POST http://localhost:3000/api/bindings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "targetUrl": "wss://echo.websocket.org",
    "targetProtocol": "autoglm",
    "authKey": "test-key"
  }')
echo "Create Response: $RESPONSE"

ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d":" -f2 | tr -d '"')
echo "Created ID: $ID"

# List
echo "Listing bindings:"
curl -s http://localhost:3000/api/bindings

# Bridge Request (Should fail/connect but return stream)
# We test if it accepts the request
echo "Testing Bridge Endpoint..."
curl -N -X POST "http://localhost:3000/api/bridge/$ID" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req-1",
    "messages": [{"role": "user", "content": "Hello"}]
  }' &
PID=$!
sleep 2
kill $PID
echo ""
echo "Done."
