#!/bin/bash

echo "============================================"
echo "  Local Search Engine - Stop Services"
echo "============================================"
echo ""

echo "Stopping services..."

# Stop frontend (port 3000)
FRONTEND_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
    kill -9 $FRONTEND_PID 2>/dev/null
    echo "Stopped Frontend (Port 3000)"
fi

# Stop backend (port 3002)
BACKEND_PID=$(lsof -ti:3002 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
    kill -9 $BACKEND_PID 2>/dev/null
    echo "Stopped Backend (Port 3002)"
fi

echo ""
echo "All services stopped."
echo ""
