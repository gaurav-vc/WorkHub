import json
import re

log_file = r"c:\Users\MC VIP\.gemini\antigravity-ide\brain\ce5401dd-1164-4a2c-91b9-728c220e41fa\.system_generated\logs\transcript_full.jsonl"
lines = {}

with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'VIEW_FILE' and 'UsersRoles.tsx' in data.get('content', ''):
                content = data.get('content', '')
                for content_line in content.split('\n'):
                    if ':' in content_line and content_line.split(':')[0].isdigit():
                        line_num = int(content_line.split(':')[0])
                        # Remove the line number prefix, which is like "123: "
                        text = content_line[len(str(line_num))+2:]
                        if text.endswith('\r'):
                            text = text[:-1]
                        lines[line_num] = text
        except Exception as e:
            pass

with open(r"c:\Users\MC VIP\OneDrive\Documents\project\frontend\src\pages\UsersRoles_recovered.tsx", 'w', encoding='utf-8') as f:
    if not lines:
        f.write("// No lines found\n")
    else:
        for i in range(1, max(lines.keys()) + 1):
            f.write(lines.get(i, f"// MISSING LINE {i}") + "\n")

print(f"Recovered {len(lines)} lines.")
