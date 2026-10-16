#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "==================================================================="
echo "  StoryMotion AI - Zero-Cost Local WAN 2.1 Video Server"
echo "==================================================================="
python3 -m pip install -r requirements.txt
python3 local_wan_server.py --port 8000 --model wan-2.1-t2v-1.4b --device cuda
