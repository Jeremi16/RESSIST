#!/usr/bin/env python3
"""Script untuk push perubahan ke GitHub"""

import subprocess
import sys


def run_cmd(cmd, cwd=None):
    """Jalankan command dan tampilkan output"""
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode


def main():
    repo_path = r"C:\Users\Jeremi\Documents\e-learning-bot"

    # 1. Check status
    run_cmd("git status", cwd=repo_path)

    # 2. Add file yang diubah
    files_to_add = [
        "backend/internal/auth/service.go",
        "backend/internal/http/handlers/auth.go",
    ]

    for f in files_to_add:
        run_cmd(f'git add "{f}"', cwd=repo_path)

    # 3. Commit
    commit_msg = "feat(auth): skip Google consent screen for returning users\n\n- Add hasExistingSession parameter to BuildGoogleLoginURL\n- Add ValidateRefreshToken function to check token without rotation\n- Add hasValidRefreshToken helper in auth handler\n- Only show consent screen for new users or first-time login"

    run_cmd(f'git commit -m "{commit_msg}"', cwd=repo_path)

    # 4. Push
    run_cmd("git push origin main", cwd=repo_path)

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
