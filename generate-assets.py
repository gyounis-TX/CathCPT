#!/usr/bin/env python3
"""
CathCPT iOS App Asset Generator

This script prepares your app icon for iOS deployment.
Place your original icon (the gold CathCPT heart icon) in this folder 
as 'original-icon.png' and run this script.

Required icon sizes for iOS:
- icon.png: 1024x1024 (App Store)
- adaptive-icon.png: 1024x1024 (Android adaptive)
- favicon.png: 48x48 (Web)
- splash.png: 1284x2778 (Splash screen)
"""

from PIL import Image, ImageDraw
import os

def create_assets(icon_path="original-icon.png"):
    """Generate all required iOS app assets from the original icon."""
    
    # Check if original icon exists
    if not os.path.exists(icon_path):
        print(f"❌ Please place your icon at: {icon_path}")
        print("   Your icon should be at least 1024x1024 pixels")
        return False
    
    # Create assets directory
    os.makedirs("assets", exist_ok=True)
    
    # Open the original icon
    img = Image.open(icon_path)
    print(f"✅ Loaded icon: {img.size[0]}x{img.size[1]}")
    
    # Ensure it's RGBA
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # 1. App Store Icon (1024x1024)
    icon_1024 = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_1024.save("assets/icon.png", "PNG")
    print("✅ Created assets/icon.png (1024x1024)")
    
    # 2. Adaptive Icon for Android (1024x1024)
    icon_1024.save("assets/adaptive-icon.png", "PNG")
    print("✅ Created assets/adaptive-icon.png (1024x1024)")
    
    # 3. Favicon (48x48)
    favicon = img.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save("assets/favicon.png", "PNG")
    print("✅ Created assets/favicon.png (48x48)")
    
    # 4. Splash Screen (1284x2778) - Icon centered on gold background
    splash_width, splash_height = 1284, 2778
    splash = Image.new('RGBA', (splash_width, splash_height), (196, 154, 61, 255))  # Gold #C49A3D
    
    # Resize icon for splash (about 40% of width)
    icon_size = int(splash_width * 0.5)
    splash_icon = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    # Center the icon
    x = (splash_width - icon_size) // 2
    y = (splash_height - icon_size) // 2 - 100  # Slightly above center
    
    # Paste icon onto splash
    splash.paste(splash_icon, (x, y), splash_icon)
    splash.save("assets/splash.png", "PNG")
    print("✅ Created assets/splash.png (1284x2778)")
    
    print("\n🎉 All assets created successfully!")
    print("\nNext steps:")
    print("1. Copy the 'assets' folder to your CathCPT Expo project")
    print("2. Run: npx expo start")
    print("3. To build for iOS: eas build --platform ios")
    
    return True


if __name__ == "__main__":
    create_assets()
