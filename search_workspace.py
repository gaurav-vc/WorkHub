import os

search_strings = ["ProtectedRoute", "usePageAccess", "accessRoutes", "RBAC"]
search_files = ["App.tsx", "AppSidebar.tsx"]

project_root = r"c:\Users\MC VIP\OneDrive\Documents\project"
skip_dirs = {"node_modules", ".git", ".venv", "__pycache__"}

found_files = []
found_strings = {s: [] for s in search_strings}

print("Searching for duplicate files and specific strings...")

for root, dirs, files in os.walk(project_root):
    # Remove skip_dirs from dirs to avoid traversing them
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    
    for file in files:
        full_path = os.path.join(root, file)
        
        # Check for duplicate files
        if file in search_files:
            found_files.append(full_path)
            
        # Search for strings (only in text files, simple heuristic)
        if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.json', '.md', '.txt', '.py', '.html')):
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    for s in search_strings:
                        if s in content:
                            found_strings[s].append(full_path)
            except Exception as e:
                pass

print("\n--- DUPLICATE FILES FOUND ---")
for f in found_files:
    print(f)

print("\n--- STRING MATCHES ---")
for s in search_strings:
    print(f"\nMatches for '{s}':")
    for match in set(found_strings[s]):
        print(match)

