#!/bin/bash

echo "Starting Mars Landing Game server..."
echo "Once the server is running, open http://localhost:8000 in your web browser"
echo "Press Ctrl+C to stop the server when done"
echo ""

if command -v python3 &> /dev/null; then
    python3 server.py
elif command -v python &> /dev/null; then
    python server.py
else
    echo "Error: Python is not installed or not in your PATH"
    exit 1
fi 