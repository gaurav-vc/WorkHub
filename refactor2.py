import os
import re

directory = r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src"

files_changed = 0

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.ts', '.tsx')) and file != 'config.ts':
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content
            
            # Remove direct API_BASE definitions using 127.0.0.1
            content = re.sub(r'(?:export )?const API_BASE = import\.meta\.env\.VITE_API_BASE_URL \?\? ["\']http://127\.0\.0\.1:8000/api["\'];?\n?', '', content)
            content = re.sub(r'const API(?:_BASE)?\s*=\s*["\']http://127\.0\.0\.1:8000/api["\'];?\n?', '', content)
            
            # Replace inline double and single quoted URLs with template literals
            content = re.sub(r'\"http://127\.0\.0\.1:8000/api([^\"]*)\"', r'`${API_BASE}\1`', content)
            content = re.sub(r'\'http://127\.0\.0\.1:8000/api([^\']*)\'', r'`${API_BASE}\1`', content)
            
            # Replace any remaining (which would be inside existing template literals)
            content = content.replace('http://127.0.0.1:8000/api', '${API_BASE}')
            
            if content != original_content:
                # Add import if missing
                if 'import { API_BASE } from "@/config";' not in content:
                    # Insert after the last import statement or at the top
                    imports_end = 0
                    for match in re.finditer(r'^import .*?;?\n', content, re.MULTILINE):
                        imports_end = match.end()
                    
                    if imports_end > 0:
                        content = content[:imports_end] + 'import { API_BASE } from "@/config";\n' + content[imports_end:]
                    else:
                        content = 'import { API_BASE } from "@/config";\n' + content

                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                files_changed += 1

print(f"Successfully fixed {files_changed} files.")
