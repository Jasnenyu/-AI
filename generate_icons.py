#!/usr/bin/env python3
"""
生成 Tauri 应用所需的所有图标格式和尺寸
"""

from PIL import Image
import os
import sys

# 图标配置
ICON_SIZES = [32, 64, 128, 256, 512, 1024]
SQUARE_LOGO_SIZES = [30, 44, 71, 89, 107, 142, 150, 284, 310]

# 路径配置
ICONS_DIR = "src-tauri/icons"
SOURCE_ICON = os.path.join(ICONS_DIR, "icon.png")

def generate_png_icons():
    """生成各种尺寸的 PNG 图标"""
    print("正在生成 PNG 图标...")
    
    # 打开源图标
    img = Image.open(SOURCE_ICON)
    
    # 确保是 RGBA 模式
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # 生成标准尺寸图标
    for size in ICON_SIZES:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        if size == 32:
            output_path = os.path.join(ICONS_DIR, "32x32.png")
        elif size == 64:
            output_path = os.path.join(ICONS_DIR, "64x64.png")
        elif size == 128:
            output_path = os.path.join(ICONS_DIR, "128x128.png")
            resized.save(output_path)
            # 同时生成 2x 版本
            output_path_2x = os.path.join(ICONS_DIR, "128x128@2x.png")
            resized_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
            resized_256.save(output_path_2x)
            print(f"  已生成: 128x128@2x.png (256x256)")
        elif size == 256:
            output_path = os.path.join(ICONS_DIR, "icon_Windows.png")
        elif size == 512:
            output_path = os.path.join(ICONS_DIR, "icon_macOS.png")
        elif size == 1024:
            output_path = os.path.join(ICONS_DIR, "StoreLogo.png")
        else:
            continue
            
        resized.save(output_path)
        print(f"  已生成: {os.path.basename(output_path)} ({size}x{size})")
    
    # 生成 SquareLogo 图标
    for size in SQUARE_LOGO_SIZES:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        output_path = os.path.join(ICONS_DIR, f"Square{size}x{size}Logo.png")
        resized.save(output_path)
        print(f"  已生成: Square{size}x{size}Logo.png ({size}x{size})")
    
    print("PNG 图标生成完成！")

def generate_ico():
    """生成 Windows 用的 .ico 文件"""
    print("\n正在生成 Windows ICO 图标...")
    
    img = Image.open(SOURCE_ICON)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # ICO 文件需要多个尺寸
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    
    # 创建多尺寸的图标列表
    icon_images = []
    for size in sizes:
        resized = img.resize(size, Image.Resampling.LANCZOS)
        icon_images.append(resized)
    
    # 保存为 ICO
    output_path = os.path.join(ICONS_DIR, "icon.ico")
    icon_images[0].save(
        output_path,
        format='ICO',
        sizes=sizes,
        append_images=icon_images[1:]
    )
    print(f"  已生成: icon.ico (包含尺寸: {sizes})")

def generate_icns():
    """生成 macOS 用的 .icns 文件"""
    print("\n正在生成 macOS ICNS 图标...")
    
    # 注意：PIL 不直接支持 ICNS 格式
    # 我们需要使用 iconutil 或创建临时文件
    # 这里我们生成 PNG，然后告诉用户如何手动转换
    
    img = Image.open(SOURCE_ICON)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # 生成 macOS 需要的各种尺寸
    mac_sizes = [16, 32, 64, 128, 256, 512, 1024]
    
    # 创建临时目录
    temp_dir = os.path.join(ICONS_DIR, "icon.iconset")
    os.makedirs(temp_dir, exist_ok=True)
    
    for size in mac_sizes:
        # 1x 版本
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        if size <= 512:
            output_path = os.path.join(temp_dir, f"icon_{size}x{size}.png")
            resized.save(output_path)
        
        # 2x 版本（除了 1024）
        if size <= 512:
            resized_2x = img.resize((size * 2, size * 2), Image.Resampling.LANCZOS)
            output_path_2x = os.path.join(temp_dir, f"icon_{size}x{size}@2x.png")
            resized_2x.save(output_path_2x)
    
    print(f"  已生成 icon.iconset 文件夹，包含 macOS 所需的所有尺寸")
    print(f"  注意：ICNS 文件需要使用 macOS 的 iconutil 工具生成")
    print(f"  在 macOS 上运行: iconutil -c icns {temp_dir}")
    
    # 尝试使用 png2icns（如果安装了的话）
    try:
        import subprocess
        result = subprocess.run(['which', 'png2icns'], capture_output=True, text=True)
        if result.returncode == 0:
            # 使用最大的 PNG 生成 ICNS
            largest_png = os.path.join(temp_dir, "icon_512x512@2x.png")
            output_icns = os.path.join(ICONS_DIR, "icon.icns")
            subprocess.run(['png2icns', output_icns, largest_png], check=True)
            print(f"  已生成: icon.icns")
        else:
            # 复制最大的 PNG 作为备用
            largest_png = os.path.join(temp_dir, "icon_512x512@2x.png")
            output_icns = os.path.join(ICONS_DIR, "icon.icns.png")
            img_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
            img_1024.save(output_icns)
            print(f"  已生成备用: icon.icns.png (1024x1024)")
    except Exception as e:
        print(f"  警告: 无法生成 ICNS 文件: {e}")
        print(f"  已创建 icon.iconset 文件夹，可以手动转换")

def main():
    print("=" * 60)
    print("Tauri 图标生成工具")
    print("=" * 60)
    
    # 检查源文件是否存在
    if not os.path.exists(SOURCE_ICON):
        print(f"错误: 源图标文件不存在: {SOURCE_ICON}")
        print("请确保 icon.png 存在于 src-tauri/icons/ 目录")
        sys.exit(1)
    
    print(f"源图标: {SOURCE_ICON}")
    print(f"输出目录: {ICONS_DIR}")
    print()
    
    # 生成各种图标
    generate_png_icons()
    generate_ico()
    generate_icns()
    
    print("\n" + "=" * 60)
    print("图标生成完成！")
    print("=" * 60)
    print("\n生成的文件:")
    for f in sorted(os.listdir(ICONS_DIR)):
        if f.endswith(('.png', '.ico', '.icns')):
            filepath = os.path.join(ICONS_DIR, f)
            size = os.path.getsize(filepath)
            print(f"  - {f} ({size/1024:.1f} KB)")

if __name__ == "__main__":
    main()
