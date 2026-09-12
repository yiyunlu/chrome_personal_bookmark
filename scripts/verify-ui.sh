#!/usr/bin/env bash
# Acceptance gate for the shadcn/ui migration (see SHADCN_MIGRATION.md).
# Run from the repo root. Every phase must exit 0 before it is merged.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fail=1; }
info() { printf '  ----  %s\n' "$1"; }

# Baselines captured at P0 (commit 27b0f0e).
BASE_TESTS=171
BASE_WARNINGS=11
BASE_CARD_ATTR=7
BASE_COLLECTION_ATTR=4
BASE_DRAGGABLE_ATTR=6
CAP_JS_GZ=160000
CAP_CSS_GZ=14000

echo "== 1. unit tests =="
# vitest colourises its summary; ANSI codes contain digits, so strip them first.
test_out=$(npm test 2>&1 | sed -E $'s/\x1b\\[[0-9;]*m//g')
t_pass=$(printf '%s' "$test_out" | grep -oE 'Tests[^0-9]*([0-9]+) passed' | grep -oE '[0-9]+' | head -1)
if printf '%s' "$test_out" | grep -qE '[0-9]+ failed'; then
  bad "test failures present"
elif [ -z "${t_pass:-}" ]; then
  bad "could not parse test output"
elif [ "$t_pass" -lt "$BASE_TESTS" ]; then
  bad "test count went down: $t_pass < $BASE_TESTS (tests may be replaced, never deleted)"
else
  pass "$t_pass tests passing (baseline $BASE_TESTS)"
fi

echo "== 2. lint =="
lint_out=$(npm run lint 2>&1)
errs=$(printf '%s' "$lint_out" | grep -oE '([0-9]+) error' | grep -oE '[0-9]+' | tail -1)
warns=$(printf '%s' "$lint_out" | grep -oE '([0-9]+) warning' | grep -oE '[0-9]+' | tail -1)
errs=${errs:-0}; warns=${warns:-0}
[ "$errs" -eq 0 ] && pass "0 eslint errors" || bad "$errs eslint errors"
[ "$warns" -le "$BASE_WARNINGS" ] && pass "$warns warnings (<= $BASE_WARNINGS)" \
  || bad "$warns warnings (> baseline $BASE_WARNINGS)"

echo "== 3. production build =="
if npm run build >/tmp/verify-ui-build.log 2>&1; then
  pass "vite build ok"
else
  bad "vite build failed (see /tmp/verify-ui-build.log)"
fi

echo "== 4. compiled CSS sanity =="
css=$(ls dist/assets/*.css 2>/dev/null | head -1)
if [ -z "$css" ]; then
  bad "no built CSS found"
else
  grep -q 'hsl(oklch' "$css" && bad "hsl(oklch(...)) in output — a shadcn add re-introduced oklch tokens" \
    || pass "no hsl(oklch(...)) in output"
  grep -q 'hsl(var(--ui-primary))' "$css" && pass "token indirection intact" \
    || bad "hsl(var(--ui-primary)) missing — token layer broken"
fi

echo "== 5. every --ui-* the Tailwind config reads is defined =="
missing=""
for tok in $(grep -oE '\-\-ui-[a-z-]+' tailwind.config.js | sort -u); do
  grep -qE "(^|[;{[:space:]])${tok}:" src/index.css || missing="$missing $tok"
done
[ -z "$missing" ] && pass "all --ui-* tokens defined in src/index.css" \
  || bad "undefined tokens:$missing"

echo "== 6. no unprefixed shadcn token shadowing the legacy palette =="
shadow=""
for tok in --background --foreground --card --card-foreground --popover --popover-foreground \
           --primary --primary-foreground --secondary --secondary-foreground \
           --muted-foreground --accent-foreground --destructive --destructive-foreground \
           --border --ring --radius; do
  grep -qE "(^|[;{[:space:]])${tok}:" src/index.css && shadow="$shadow $tok"
done
[ -z "$shadow" ] && pass "no unprefixed shadcn tokens in src/index.css" \
  || bad "unprefixed tokens would shadow the legacy vars:$shadow"

echo "== 7. src/lib/utils.js intact =="
for fn in faviconCandidates normalizeUrlKey sortSnapshots; do
  grep -q "export function $fn\|export const $fn" src/lib/utils.js \
    && pass "utils.js still exports $fn" || bad "utils.js lost $fn (shadcn clobber?)"
done

echo "== 8. ESM / dependency hygiene =="
grep -q 'require(' tailwind.config.js && bad "require() in ESM tailwind.config.js" \
  || pass "tailwind.config.js is ESM-clean"
grep -rq "from ['\"]next-themes" src/ && bad "next-themes imported (Next.js only)" \
  || pass "no next-themes import"

echo "== 9. SortableJS DOM invariants =="
c=$(grep -roh 'data-card-id' src | wc -l | tr -d ' ')
l=$(grep -roh 'data-collection-id' src | wc -l | tr -d ' ')
d=$(grep -roh 'data-draggable' src | wc -l | tr -d ' ')
[ "$c" -ge "$BASE_CARD_ATTR" ] && pass "data-card-id x$c (>= $BASE_CARD_ATTR)" || bad "data-card-id dropped to $c"
[ "$l" -ge "$BASE_COLLECTION_ATTR" ] && pass "data-collection-id x$l (>= $BASE_COLLECTION_ATTR)" || bad "data-collection-id dropped to $l"
[ "$d" -ge "$BASE_DRAGGABLE_ATTR" ] && pass "data-draggable x$d (>= $BASE_DRAGGABLE_ATTR)" || bad "data-draggable dropped to $d"

echo "== 10. i18n: no hardcoded CJK in components =="
cjk=$(grep -rlE '[一-鿿]' src/components src/main.jsx 2>/dev/null | wc -l | tr -d ' ')
[ "$cjk" -eq 0 ] && pass "all user-facing strings go through t()" \
  || { bad "hardcoded CJK in $cjk file(s):"; grep -rlE '[一-鿿]' src/components src/main.jsx | sed 's/^/        /'; }

echo "== 11. bundle budget =="
js=$(ls -S dist/assets/*.js 2>/dev/null | head -1)
if [ -n "$js" ] && [ -n "$css" ]; then
  jz=$(gzip -c "$js" | wc -c | tr -d ' ')
  cz=$(gzip -c "$css" | wc -c | tr -d ' ')
  [ "$jz" -le "$CAP_JS_GZ" ] && pass "JS ${jz}B gz (cap ${CAP_JS_GZ})" || bad "JS ${jz}B gz over cap ${CAP_JS_GZ}"
  [ "$cz" -le "$CAP_CSS_GZ" ] && pass "CSS ${cz}B gz (cap ${CAP_CSS_GZ})" || bad "CSS ${cz}B gz over cap ${CAP_CSS_GZ}"
else
  info "bundle budget skipped (no build output)"
fi

echo
[ "$fail" -eq 0 ] && echo "ALL GATES PASSED" || echo "GATES FAILED"
exit $fail
