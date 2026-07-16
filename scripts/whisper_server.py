#!/usr/bin/env python3
"""
Whisper 本地语音识别服务
用法: python whisper_server.py
接收 HTTP POST 请求，包含音频文件，返回识别结果
"""
import sys
import os

# 添加项目目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import whisper
import soundfile as sf
import numpy as np
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs
import json
import base64
import io

# 全局模型实例
_model = None

def load_model():
    """加载 whisper tiny 模型（一次性）"""
    global _model
    if _model is None:
        print("正在加载 Whisper tiny 模型...", file=sys.stderr)
        _model = whisper.load_model("tiny")
        print("模型加载完成", file=sys.stderr)
    return _model

class WhisperHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # 只打印错误
        pass

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path == '/transcribe':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                audio_base64 = self.rfile.read(content_length).decode('utf-8')

                # 解码 base64
                import base64 as b64
                audio_data = b64.b64decode(audio_base64)

                # 保存到临时文件（Whisper 支持多种格式，包括 webm/opus）
                with tempfile.NamedTemporaryFile(suffix='.webm', delete=False, mode='wb') as f:
                    f.write(audio_data)
                    temp_path = f.name

                try:
                    # 转录音频 - whisper 可以直接处理 webm/opus
                    model = load_model()
                    result = model.transcribe(temp_path, language='zh', fp16=False)

                    response = {
                        'success': True,
                        'text': result['text'].strip(),
                        'language': result.get('language', 'zh')
                    }
                finally:
                    # 删除临时文件
                    os.unlink(temp_path)

            except Exception as e:
                import traceback
                traceback.print_exc()
                response = {'success': False, 'error': str(e)}

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
        else:
            self.send_response(404)
            self.end_headers()

def run_server(port=8765):
    server = HTTPServer(('127.0.0.1', port), WhisperHandler)
    print(f"Whisper 服务已启动: http://127.0.0.1:{port}", file=sys.stderr)
    server.serve_forever()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    run_server(port)
