import os
import re

def update_models(app_dir):
    models_path = os.path.join(app_dir, 'models.py')
    if not os.path.exists(models_path): return
    
    with open(models_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if 'TenantModel' not in content and 'models.Model' in content:
        # Avoid core, organization, authentication
        if any(x in app_dir for x in ['organization', 'authentication', 'core', 'role_base_access', 'venv', 'admin_settings', '__pycache__']):
            return
            
        content = 'from core.tenant import TenantModel\n' + content
        content = re.sub(r'class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:', r'class \1(TenantModel):', content)
        
        with open(models_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {models_path}')

base_dir = r'c:\Users\MC VIP\OneDrive\Documents\project\backend'
for d in os.listdir(base_dir):
    app_dir = os.path.join(base_dir, d)
    if os.path.isdir(app_dir):
        update_models(app_dir)
