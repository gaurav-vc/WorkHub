import os

directory = r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src"
target_api_str = 'const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";'
replacement_api_str = 'import { API_BASE } from "@/config";'

target_media_str = 'const MEDIA_BASE = "http://localhost:8000";'
replacement_media_str = 'import { MEDIA_BASE } from "@/config";'

files_changed = 0

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            # Skip the config file itself
            if file == 'config.ts':
                continue
                
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content.replace(target_api_str, replacement_api_str)
            new_content = new_content.replace(target_media_str, replacement_media_str)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                files_changed += 1

print(f"Successfully replaced URLs in {files_changed} files.")
