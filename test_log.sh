#!/bin/bash
curl -N -X POST "http://localhost:3000/api/bridge/terminal-test-agent" \
  -H "Content-Type: application/json" \
  -d '{
  "message_id": "term-test-1",
  "agent_id": "terminal-test-agent",
  "message": [
    {
      "role": "user",
      "type": "text",
      "text": "Terminal Test Message"
    }
  ]
}' &

PID=$!
sleep 2
kill $PID
