#!/usr/bin/env python3
"""
小红书自动发布 Agent - Python CLI 工具
便于集成到各种 AI Agent 框架（如 OpenClaw, Claude Code 等）
"""

import json
import sys
import argparse
import urllib.request
import urllib.error
from typing import Optional, Dict, Any

# 后端 API 地址
DEFAULT_API_URL = "http://localhost:3001"


def make_request(endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
    """发送 HTTP 请求到后端 API"""
    url = f"{DEFAULT_API_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    body = None
    if data:
        body = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {"success": False, "error": f"HTTP {e.code}: {error_body}"}
    except urllib.error.URLError as e:
        return {"success": False, "error": f"网络错误：{e.reason}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def check_login():
    """检查登录状态"""
    print("检查小红书登录状态...", file=sys.stderr)
    result = make_request("/api/login/status")
    
    if result.get("success"):
        data = result.get("data", {})
        if data.get("isLoggedIn"):
            print(json.dumps({
                "status": "logged_in",
                "message": "已登录",
                "url": data.get("url", "")
            }, ensure_ascii=False, indent=2))
        else:
            print(json.dumps({
                "status": "not_logged_in",
                "message": "未登录，请先登录",
                "login_url": "http://localhost:3000/login"
            }, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({
            "status": "error",
            "message": result.get("message", "检查失败")
        }, ensure_ascii=False, indent=2))


def check_model_config():
    """检查模型配置"""
    print("检查模型配置...", file=sys.stderr)
    result = make_request("/api/model-config")
    
    if result.get("success"):
        data = result.get("data", {})
        print(json.dumps({
            "status": "configured" if data.get("textApiKeySet") else "not_configured",
            "text_provider": data.get("textProvider", "unknown"),
            "image_provider": data.get("imageProvider", "unknown"),
            "text_api_key_set": data.get("textApiKeySet", False),
            "image_api_key_set": data.get("imageApiKeySet", False),
            "config_url": "http://localhost:3000/settings"
        }, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({
            "status": "error",
            "message": result.get("message", "检查失败")
        }, ensure_ascii=False, indent=2))


def generate_content(topic: str, style: str = "生活分享", keywords: list = None, image_count: int = 3):
    """生成内容"""
    print(f"生成内容：{topic}...", file=sys.stderr)
    
    data = {
        "topic": topic,
        "style": style,
        "keywords": keywords or [],
        "imageCount": image_count
    }
    
    result = make_request("/api/generate", method="POST", data=data)
    
    if result.get("success"):
        content = result.get("content", {})
        print(json.dumps({
            "status": "success",
            "title": content.get("title", ""),
            "content": content.get("content", ""),
            "topics": content.get("topics", []),
            "images": content.get("images", []),
            "image_count": len(content.get("images", []))
        }, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({
            "status": "error",
            "message": result.get("error", "生成失败")
        }, ensure_ascii=False, indent=2))


def publish_content(title: str, content: str, topics: list, images: list):
    """发布内容"""
    print(f"发布内容：{title}...", file=sys.stderr)
    
    data = {
        "content": {
            "title": title,
            "content": content,
            "topics": topics,
            "images": images
        }
    }
    
    result = make_request("/api/publish", method="POST", data=data)
    
    if result.get("success"):
        print(json.dumps({
            "status": "success",
            "message": "发布成功",
            "note_url": result.get("noteUrl", ""),
            "note_id": result.get("noteId", "")
        }, ensure_ascii=False, indent=2))
    else:
        print(json.dumps({
            "status": "error",
            "message": result.get("message", "发布失败")
        }, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description="小红书自动发布 Agent CLI")
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # check-login 命令
    check_login_parser = subparsers.add_parser("check-login", help="检查登录状态")
    
    # check-model 命令
    check_model_parser = subparsers.add_parser("check-model", help="检查模型配置")
    
    # generate 命令
    gen_parser = subparsers.add_parser("generate", help="生成内容")
    gen_parser.add_argument("-t", "--topic", required=True, help="主题")
    gen_parser.add_argument("-s", "--style", default="生活分享", help="风格")
    gen_parser.add_argument("-k", "--keywords", nargs="*", help="关键词")
    gen_parser.add_argument("-i", "--images", type=int, default=3, help="图片数量")
    
    # publish 命令
    pub_parser = subparsers.add_parser("publish", help="发布内容")
    pub_parser.add_argument("--title", required=True, help="标题")
    pub_parser.add_argument("--content", required=True, help="正文")
    pub_parser.add_argument("--topics", nargs="*", help="话题")
    pub_parser.add_argument("--images", nargs="*", help="图片路径")
    
    args = parser.parse_args()
    
    if args.command == "check-login":
        check_login()
    elif args.command == "check-model":
        check_model_config()
    elif args.command == "generate":
        generate_content(args.topic, args.style, args.keywords, args.images)
    elif args.command == "publish":
        publish_content(args.title, args.content, args.topics or [], args.images or [])
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
