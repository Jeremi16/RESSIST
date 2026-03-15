import os

# Delete temporary files
files_to_delete = [
    "frontend/app/roadmap/versi-temp.tsx",
    "create_versi.py",
    "delete_temp.py",
]

for file in files_to_delete:
    try:
        if os.path.exists(file):
            os.remove(file)
            print(f"Deleted: {file}")
        else:
            print(f"Not found: {file}")
    except Exception as e:
        print(f"Error deleting {file}: {e}")

print("\nCleanup complete!")
