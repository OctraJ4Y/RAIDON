#!/bin/bash

PROJECT="negfiesrxejowqjmuwxn"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2ZpZXNyeGVqb3dxam11d3huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkyNzAsImV4cCI6MjA3NzE0NTI3MH0.IRqGb-_RXqyuDe53G2L9gb0rC4WPmWBtvuaA-GSWs5w"

echo "Status"
curl -s "https://$PROJECT.supabase.co/functions/v1/bot-status" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"

echo -e "\n\nStats"
curl -s "https://$PROJECT.supabase.co/functions/v1/bot-stats" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"

echo -e "\n\nLeaderboard"
curl -s "https://$PROJECT.supabase.co/functions/v1/get-leaderboard" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"