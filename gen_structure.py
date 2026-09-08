import os

EXCLUDE_DIRS = {
    ".venv", "venv", "node_modules", "__pycache__",
    ".git", "dist", "build", ".pytest_cache",
    ".vite", ".turbo", "*.dist-info"
}

def should_skip(name):
    return name in EXCLUDE_DIRS or name.endswith(".dist-info")

def print_tree(root, prefix="", file=None):
    entries = sorted(os.listdir(root))
    entries = [e for e in entries if not should_skip(e)]
    for i, entry in enumerate(entries):
        path = os.path.join(root, entry)
        connector = "└── " if i == len(entries) - 1 else "├── "
        line = prefix + connector + entry
        print(line, file=file)
        if os.path.isdir(path):
            extension = "    " if i == len(entries) - 1 else "│   "
            print_tree(path, prefix + extension, file=file)

if __name__ == "__main__":
    with open("Structure.txt", "w", encoding="utf-8") as f:
        print(".", file=f)
        print_tree(".", file=f)
    print("Selesai! Cek Structure.txt")