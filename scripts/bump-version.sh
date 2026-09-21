#!/usr/bin/env bash
set -euo pipefail

# bump-version.sh
# Usage: ./scripts/bump-version.sh [patch|minor|major|X.Y.Z] [--commit] [--tag]

BUMP_TYPE="${1:-patch}"
DO_COMMIT=false
DO_TAG=false

for arg in "$@"; do
  if [ "$arg" = "--commit" ]; then
    DO_COMMIT=true
  elif [ "$arg" = "--tag" ]; then
    DO_TAG=true
    DO_COMMIT=true
  fi
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARGO_TOML="$ROOT_DIR/Cargo.toml"
PACKAGE_JSON="$ROOT_DIR/frontend/package.json"
PACKAGE_LOCK="$ROOT_DIR/frontend/package-lock.json"
CHANGELOG="$ROOT_DIR/CHANGELOG.md"

# 1. Extract current version from Cargo.toml
CURRENT_VERSION=$(grep -m1 '^version = ' "$CARGO_TOML" | sed -E 's/version = "(.*)"/\1/')
if [ -z "$CURRENT_VERSION" ]; then
  echo "Error: Could not extract version from $CARGO_TOML" >&2
  exit 1
fi

echo "Current version: $CURRENT_VERSION"

# 2. Compute new version
NEW_VERSION=$(python3 - <<EOF
import re, sys

current = "$CURRENT_VERSION"
bump = "$BUMP_TYPE"

parts = current.split(".")
if len(parts) != 3:
    print(f"Error: Current version '{current}' is not valid semver", file=sys.stderr)
    sys.exit(1)

try:
    major, minor, patch = map(int, parts)
except ValueError:
    print(f"Error: Version numbers must be integers in '{current}'", file=sys.stderr)
    sys.exit(1)

if bump == "major":
    new_v = f"{major + 1}.0.0"
elif bump == "minor":
    new_v = f"{major}.{minor + 1}.0"
elif bump == "patch":
    new_v = f"{major}.{minor}.{patch + 1}"
elif re.match(r'^\d+\.\d+\.\d+$', bump):
    new_v = bump
else:
    print(f"Error: Unknown bump type '{bump}'. Use patch, minor, major, or X.Y.Z", file=sys.stderr)
    sys.exit(1)

print(new_v)
EOF
)

echo "New version:     $NEW_VERSION"

# 3. Update Cargo.toml
python3 - <<EOF
with open("$CARGO_TOML", "r") as f:
    content = f.read()

import re
# Replace only the first occurrence of version = "..." under [package]
content = re.sub(r'(\[package\][\s\S]*?version = ")[^"]+(")', r'\g<1>$NEW_VERSION\g<2>', content, count=1)

with open("$CARGO_TOML", "w") as f:
    f.write(content)
EOF
echo "✓ Updated $CARGO_TOML"

# 4. Update frontend/package.json and frontend/package-lock.json
if [ -f "$PACKAGE_JSON" ]; then
  python3 - <<EOF
import json
with open("$PACKAGE_JSON", "r") as f:
    data = json.load(f)
data["version"] = "$NEW_VERSION"
with open("$PACKAGE_JSON", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
EOF
  echo "✓ Updated $PACKAGE_JSON"
fi

if [ -f "$PACKAGE_LOCK" ]; then
  python3 - <<EOF
import json
with open("$PACKAGE_LOCK", "r") as f:
    data = json.load(f)
data["version"] = "$NEW_VERSION"
if "packages" in data and "" in data["packages"]:
    data["packages"][""]["version"] = "$NEW_VERSION"
with open("$PACKAGE_LOCK", "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
EOF
  echo "✓ Updated $PACKAGE_LOCK"
fi

# 5. Update CHANGELOG.md if present
if [ -f "$CHANGELOG" ]; then
  TODAY=$(date +%Y-%m-%d)
  python3 - <<EOF
with open("$CHANGELOG", "r") as f:
    content = f.read()

# If version is not already in changelog, add section below [Unreleased]
if f"## [$NEW_VERSION]" not in content:
    target = "## [Unreleased]"
    replacement = f"## [Unreleased]\n\n## [$NEW_VERSION] - $TODAY"
    if target in content:
        content = content.replace(target, replacement, 1)
        with open("$CHANGELOG", "w") as f:
            f.write(content)
        print("✓ Updated $CHANGELOG with new version section [$NEW_VERSION]")
    else:
        print("Notice: '## [Unreleased]' section not found in $CHANGELOG, skipping automatic changelog insert")
else:
    print("Notice: Version [$NEW_VERSION] already exists in $CHANGELOG")
EOF
fi

# 6. Commit and tag if requested
if [ "$DO_COMMIT" = true ]; then
  cd "$ROOT_DIR"
  git add "$CARGO_TOML" "$PACKAGE_JSON" "$PACKAGE_LOCK" "$CHANGELOG"
  git commit -m "chore(release): bump version to v$NEW_VERSION

Co-Authored-By: Claude Code <noreply@anthropic.com>"
  echo "✓ Created git commit for v$NEW_VERSION"

  if [ "$DO_TAG" = true ]; then
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    echo "✓ Created git tag v$NEW_VERSION"
    echo "Run 'git push origin main --tags' to publish the release tag."
  fi
fi

echo "Successfully bumped version to v$NEW_VERSION"
