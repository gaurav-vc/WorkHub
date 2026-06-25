import os

directory = r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src"

files_changed = 0

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace remaining ${API} with ${API_BASE}
            new_content = content.replace('${API}/', '${API_BASE}/')
            new_content = new_content.replace('${API}', '${API_BASE}')
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                files_changed += 1

print(f"Fixed {files_changed} files containing old API reference.")
