#!/usr/bin/env python3
"""
生成 Android 和 iOS 平台的图标
"""

from PIL import Image
import os
import sys

ICONS_DIR = "src-tauri/icons"
SOURCE_ICON = os.path.join(ICONS_DIR, "icon.png")

# Android 图标配置
ANDROID_CONFIG = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# iOS 图标配置
IOS_CONFIG = [
    (20, 1), (20, 2), (20, 3),
    (29, 1), (29, 2), (29, 3),
    (40, 1), (40, 2), (40, 3),
    (60, 2), (60, 3),
    (76, 1), (76, 2),
    (83.5, 2),
    (512, 2),  # App Store
]

def generate_android_icons():
    """生成 Android 图标"""
    print("正在生成 Android 图标...")
    
    img = Image.open(SOURCE_ICON)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    android_dir = os.path.join(ICONS_DIR, "android")
    
    for folder, size in ANDROID_CONFIG.items():
        folder_path = os.path.join(android_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # 生成圆形图标（launcher）
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # ic_launcher.png (圆形)
        output_path = os.path.join(folder_path, "ic_launcher.png")
        resized.save(output_path)
        
        # ic_launcher_round.png (圆角)
        output_path_round = os.path.join(folder_path, "ic_launcher_round.png")
        resized.save(output_path_round)
        
        # ic_launcher_foreground.png (前景)
        output_path_fg = os.path.join(folder_path, "ic_launcher_foreground.png")
        resized.save(output_path_fg)
        
        print(f"  已生成: {folder}/ ({size}x{size})")
    
    print("Android 图标生成完成！")

def generate_ios_icons():
    """生成 iOS 图标"""
    print("\n正在生成 iOS 图标...")
    
    img = Image.open(SOURCE_ICON)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    ios_dir = os.path.join(ICONS_DIR, "ios")
    os.makedirs(ios_dir, exist_ok=True)
    
    for size, scale in IOS_CONFIG:
        pixel_size = int(size * scale)
        resized = img.resize((pixel_size, pixel_size), Image.Resampling.LANCZOS)
        
        if size == 512:
            # App Store 图标
            filename = f"AppIcon-512@2x.png"
        elif size == 83.5:
            filename = f"AppIcon-{size}x{size}@2x.png"
        else:
            if scale == 1:
                filename = f"AppIcon-{size}x{size}@1x.png"
            elif scale == 2:
                filename = f"AppIcon-{size}x{size}@2x.png"
            else:
                filename = f"AppIcon-{size}x{size}@3x.png"
        
        output_path = os.path.join(ios_dir, filename)
        resized.save(output_path)
        print(f"  已生成: {filename} ({pixel_size}x{pixel_size})")
    
    print("iOS 图标生成完成！")

def main():
    print("=" * 60)
    print("移动平台图标生成工具")
    print("=" * 60)
    
    if not os.path.exists(SOURCE_ICON):
        print(f"错误: 源图标文件不存在: {SOURCE_ICON}")
        sys.exit(1)
    
    print(f"源图标: {SOURCE_ICON}")
    print()
    
    generate_android_icons()
    generate_ios_icons()
    
    print("\n" + "=" * 60)
    print("所有移动平台图标生成完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
