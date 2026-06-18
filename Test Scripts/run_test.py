import subprocess
import os

backend_dir = r"C:\Users\MC VIP\OneDrive\Documents\project\backend"
venv_python = r"C:\Users\MC VIP\OneDrive\Documents\project\.venv\Scripts\python.exe"

with open(os.path.join(backend_dir, "debug_output.txt"), "w") as f:
    try:
        result = subprocess.run(
            [venv_python, os.path.join(backend_dir, "test_invoke.py")], 
            cwd=backend_dir,
            capture_output=True,
            text=True,
            check=True
        )
        f.write("STDOUT:\n")
        f.write(result.stdout)
        f.write("\nSTDERR:\n")
        f.write(result.stderr)
    except subprocess.CalledProcessError as e:
        f.write("CRASHED WITH ERROR:\n")
        f.write("STDOUT:\n")
        f.write(e.stdout)
        f.write("\nSTDERR:\n")
        f.write(e.stderr)
