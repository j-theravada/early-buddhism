#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

skill=early-buddhism-turso-import
canonical=".agents/skills/$skill"
claude=".claude/skills/$skill"

test -f "$canonical/SKILL.md"
test -f "$canonical/agents/openai.yaml"
test -L "$claude"
test "$(readlink "$claude")" = "../../.agents/skills/$skill"
test -f "$claude/SKILL.md"

grep -Fq "name: $skill" "$canonical/SKILL.md"
grep -Fq 'Use this skill only in this repository.' "$canonical/SKILL.md"

for path in "$canonical/SKILL.md" "$claude"; do
  if git check-ignore -q -- "$path"; then
    echo "Project agent skill is ignored: $path" >&2
    exit 1
  fi
done

echo 'project agent skills passed'
