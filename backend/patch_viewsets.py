import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into classes to check for get_queryset individually
    class_blocks = re.split(r'^(class\s+\w+.*?):$', content, flags=re.MULTILINE)
    
    if len(class_blocks) <= 1:
        return

    new_content = class_blocks[0]
    changed = False

    for i in range(1, len(class_blocks), 2):
        class_def = class_blocks[i] + ":"
        class_body = class_blocks[i+1]

        # Check if it has a static queryset
        queryset_match = re.search(r'^(\s+)queryset\s*=\s*(.*?\.objects\..*?)$', class_body, flags=re.MULTILINE)
        
        # Check if it ALREADY has a get_queryset method
        has_get_queryset = re.search(r'^\s+def get_queryset\s*\(', class_body, flags=re.MULTILINE)

        if queryset_match and not has_get_queryset:
            indent = queryset_match.group(1)
            original_qs_line = queryset_match.group(0)
            
            # Use self.__class__.queryset.all() or rebuild the queryset entirely
            # The safest approach is to just run what was on the right hand side!
            # Example: queryset = Course.objects.all().order_by('-created_at')
            # becomes: return Course.objects.all().order_by('-created_at')
            rhs = queryset_match.group(2)
            
            replacement = f"{original_qs_line}\n\n{indent}def get_queryset(self):\n{indent}    return {rhs}"
            class_body = class_body.replace(original_qs_line, replacement, 1)
            changed = True
            
        new_content += class_def + class_body

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched: {filepath}")

def main():
    backend_dir = r"c:\Users\MC VIP\OneDrive\Documents\project\backend"
    for root, _, files in os.walk(backend_dir):
        if 'venv' in root or '.venv' in root:
            continue
        for file in files:
            if file == 'views.py':
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
