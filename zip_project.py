import os
import zipfile

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ('node_modules', 'target', 'dist', '.git', '.idea', 'docker-entrypoint-initdb.d')]
        for file in files:
            if file.endswith('.mv.db') or file.endswith('.trace.db') or file.endswith('.log'):
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, os.path.dirname(path))
            try:
                ziph.write(file_path, arcname)
            except Exception as e:
                print(f"Skipping {file_path} due to error: {e}")

with zipfile.ZipFile('update.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('frontend', zipf)
    zipdir('backend', zipf)
    zipf.write('docker-compose.yml')

print("Zip created successfully.")
