#!/usr/bin/env python3
"""
生成 iOS 文件夹中缺失的 -1 图标
"""

from PIL import Image
import os

ICONS_DIR = "src-tauri/icons"
SOURCE_ICON = os.path.join(ICONS_DIR, "icon.png")

def fix_ios_icons():
    """生成缺失的 iOS 图标"""
    print("正在生成缺失的 iOS 图标...")
    
    img = Image.open(SOURCE_ICON)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    ios_dir = os.path.join(ICONS_DIR, "ios")
    
    # 需要生成的 -1 图标
    missing_icons = [
        ("AppIcon-20x20@2x-1.png", 40),
        ("AppIcon-29x29@2x-1.png", 58),
        ("AppIcon-40x40@2x-1.png", 80),
    ]
    
    for filename, size in missing_icons:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        output_path = os.path.join(ios_dir, filename)
        resized.save(output_path)
        print(f"  已生成: {filename} ({size}x{size})")
    
    print("iOS 图标修复完成！")

if __name__ == "__main__":
    fix_ios_icons()
