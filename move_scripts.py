import os
import shutil

# Files to move
files_to_move = [
    'test_api.py',
    'backend/check_db.py',
    'backend/db_fix.py',
    'backend/fix_db.py',
    'backend/hit_delete.py',
    'backend/run_test.py',
    'backend/test.py',
    'backend/test_access.py',
    'backend/test_api.py',
    'backend/test_delete.py',
    'backend/test_invoke.py',
    'backend/test_perms.py'
]

# Create destination folder
dest_folder = 'Test Scripts'
os.makedirs(dest_folder, exist_ok=True)

# Move files
for file_path in files_to_move:
    if os.path.exists(file_path):
        filename = os.path.basename(file_path)
        dest_path = os.path.join(dest_folder, filename)
        
        # Move file, overwriting if exists (using shutil.move or os.replace)
        try:
            shutil.move(file_path, dest_path)
            print(f"Moved {file_path} to {dest_path}")
        except Exception as e:
            print(f"Failed to move {file_path}: {e}")

print("Done moving test scripts.")
