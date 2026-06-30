# Motto Core CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `motto lint` and `motto build` CLI that validates a project's skills against the Motto schema and packages them into self-contained Claude Code plugins.

**Architecture:** A small Node ESM library (`src/`) with one responsibility per file — frontmatter parsing, config loading, schema validation, skill discovery, lint orchestration, build — wired together by a thin CLI (`bin/motto.js`). The tool operates on a *target project* directory containing `skills/`, `shared/`, and `motto.yaml`, and emits `dist/public` (+ optional `dist/private`) plugin folders.

**Tech Stack:** Node ≥20, plain ESM JavaScript, `node --test` (stdlib test runner), `yaml` (only runtime dependency).

**Out of scope (separate follow-up plan):** Distribution — packaging Motto itself as a plugin, the meta-skill content, global install / per-project version pinning. These depend on the open install-mechanism decision. The core CLI here is complete and testable without them.

## Global Constraints

- Runtime: **Node ≥ 20** (uses stdlib `node --test` and `fs.cpSync`).
- Dependencies: **only `yaml`**. No schema/validation/CLI-framework libraries.
- Output skills are **standard Agent Skills** — `SKILL.md` content is copied **verbatim**, no frontmatter stripping (unknown keys are harmless).
- Skill `name`: **kebab-case**, must equal its folder name.
- Body spine (mandatory): first non-blank line is an `# ` H1 (Title); body contains a `**Role:**` line.
- `audience`: **`public` | `private`** only (binary).
- Private plugin is **optional**: emitted only if private skills exist **and** `plugins.private` is set in `motto.yaml`.
- Config lives in **`motto.yaml`**: `name`, `version`, `description`, `plugins.public` required; `plugins.private` optional.
- `template` frontmatter is accepted but **not validated** in v1 (templates deferred).

---

### Task 1: Project scaffold + frontmatter parser

**Files:**
- Create: `package.json`
- Create: `src/frontmatter.js`
- Test: `test/frontmatter.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseFrontmatter(text: string) -> { data: object, body: string }`. Throws `Error` if no frontmatter block. `data` is the parsed YAML (empty object if the block is empty); `body` is everything after the closing `---`.

- [ ] **Step 1: Write the failing test**

```js
// test/frontmatter.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter } from '../src/frontmatter.js'

test('parses frontmatter data and body', () => {
  const text = '---\nname: my-skill\naudience: public\n---\n# Title\n\nbody text\n'
  const { data, body } = parseFrontmatter(text)
  assert.equal(data.name, 'my-skill')
  assert.equal(data.audience, 'public')
  assert.equal(body, '# Title\n\nbody text\n')
})

test('throws when frontmatter block is missing', () => {
  assert.throws(() => parseFrontmatter('# no frontmatter here'), /frontmatter/)
})

test('empty frontmatter yields empty data object', () => {
  const { data, body } = parseFrontmatter('---\n---\nbody')
  assert.deepEqual(data, {})
  assert.equal(body, 'body')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm install && node --test test/frontmatter.test.js`
Expected: FAIL — `Cannot find module '../src/frontmatter.js'`

(If `npm install` errors because `package.json` is missing, create it in Step 3 first, then re-run.)

- [ ] **Step 3: Create package.json and the implementation**

```json
// package.json
{
  "name": "motto",
  "version": "0.1.0",
  "type": "module",
  "bin": { "motto": "bin/motto.js" },
  "scripts": { "test": "node --test" },
  "dependencies": { "yaml": "^2.4.0" },
  "engines": { "node": ">=20" }
}
```

```js
// src/frontmatter.js
import YAML from 'yaml'

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

export function parseFrontmatter(text) {
  const match = text.match(FRONTMATTER)
  if (!match) throw new Error('missing frontmatter block (--- ... ---)')
  return { data: YAML.parse(match[1]) ?? {}, body: match[2] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/frontmatter.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/frontmatter.js test/frontmatter.test.js
git commit -m "feat: frontmatter parser + project scaffold"
```

---

### Task 2: Config loader

**Files:**
- Create: `src/config.js`
- Test: `test/config.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `loadConfig(projectDir: string) -> { name, version, description, plugins: { public: string, private?: string } }`. Reads `<projectDir>/motto.yaml`. Throws `Error` listing every missing required field (`name`, `version`, `description`, `plugins.public`).

- [ ] **Step 1: Write the failing test**

```js
// test/config.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig } from '../src/config.js'

function tmpProject(yaml) {
  const dir = mkdtempSync(join(tmpdir(), 'motto-cfg-'))
  writeFileSync(join(dir, 'motto.yaml'), yaml)
  return dir
}

test('loads a valid config', () => {
  const dir = tmpProject(
    'name: poems\nversion: 0.1.0\ndescription: my poems\nplugins:\n  public: poems\n  private: poems-pro\n'
  )
  const cfg = loadConfig(dir)
  assert.equal(cfg.name, 'poems')
  assert.equal(cfg.plugins.public, 'poems')
  assert.equal(cfg.plugins.private, 'poems-pro')
})

test('throws listing missing required fields', () => {
  const dir = tmpProject('name: poems\n')
  assert.throws(() => loadConfig(dir), /version[\s\S]*description[\s\S]*plugins.public/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/config.test.js`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/config.js
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import YAML from 'yaml'

export function loadConfig(projectDir) {
  const raw = readFileSync(join(projectDir, 'motto.yaml'), 'utf8')
  const cfg = YAML.parse(raw) ?? {}
  const errors = []
  for (const key of ['name', 'version', 'description']) {
    if (!cfg[key]) errors.push(`motto.yaml: missing ${key}`)
  }
  if (!cfg.plugins?.public) errors.push('motto.yaml: missing plugins.public')
  if (errors.length) throw new Error(errors.join('\n'))
  return cfg
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/config.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "feat: motto.yaml config loader"
```

---

### Task 3: Schema validator

**Files:**
- Create: `src/schema.js`
- Test: `test/schema.test.js`

**Interfaces:**
- Consumes: nothing (operates on plain objects).
- Produces: `validateSkill(skill, sharedRefs?: Set<string>) -> Array<{ skill: string, message: string }>`. `skill` is `{ dirName: string, data: object, body: string }`. Returns `[]` when valid. `sharedRefs` is the set of available shared reference basenames (without `.md`); defaults to empty.

- [ ] **Step 1: Write the failing test**

```js
// test/schema.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSkill } from '../src/schema.js'

const goodBody = '# My Skill\n\n**Role:** You are acting as a helper.\n\nDo things.\n'

function skill(over = {}) {
  return {
    dirName: 'my-skill',
    data: { name: 'my-skill', description: 'use when X', audience: 'public', ...over.data },
    body: over.body ?? goodBody,
  }
}

test('valid skill returns no errors', () => {
  assert.deepEqual(validateSkill(skill()), [])
})

test('flags missing description and bad audience', () => {
  const errs = validateSkill(skill({ data: { name: 'my-skill', audience: 'both' } }))
  const msgs = errs.map(e => e.message).join('\n')
  assert.match(msgs, /missing description/)
  assert.match(msgs, /audience must be public\|private/)
})

test('flags name not matching folder', () => {
  const errs = validateSkill(skill({ data: { name: 'other', description: 'x', audience: 'public' } }))
  assert.match(errs.map(e => e.message).join('\n'), /!= folder "my-skill"/)
})

test('flags non-kebab name', () => {
  const errs = validateSkill({ dirName: 'My_Skill', data: { name: 'My_Skill', description: 'x', audience: 'public' }, body: goodBody })
  assert.match(errs.map(e => e.message).join('\n'), /not kebab-case/)
})

test('flags missing Title and Role spine', () => {
  const errs = validateSkill(skill({ body: 'no title here\nno role either\n' }))
  const msgs = errs.map(e => e.message).join('\n')
  assert.match(msgs, /must start with "# Title"/)
  assert.match(msgs, /missing "\*\*Role:\*\*" line/)
})

test('flags unresolved shared_references', () => {
  const errs = validateSkill(
    skill({ data: { name: 'my-skill', description: 'x', audience: 'public', shared_references: ['voice', 'missing'] } }),
    new Set(['voice'])
  )
  assert.match(errs.map(e => e.message).join('\n'), /"missing" not found/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/schema.test.js`
Expected: FAIL — `Cannot find module '../src/schema.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/schema.js
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const H1 = /^#\s+\S/
const ROLE = /^\*\*Role:\*\*\s+\S/m

export function validateSkill(skill, sharedRefs = new Set()) {
  const { dirName, data, body } = skill
  const errors = []
  const push = (message) => errors.push({ skill: dirName, message })

  if (!data.name) push('frontmatter: missing name')
  else if (!KEBAB.test(data.name)) push(`frontmatter: name not kebab-case: ${data.name}`)
  else if (data.name !== dirName) push(`frontmatter: name "${data.name}" != folder "${dirName}"`)

  if (!data.description) push('frontmatter: missing description')

  if (!['public', 'private'].includes(data.audience)) {
    push(`frontmatter: audience must be public|private, got: ${data.audience}`)
  }

  const firstLine = body.split('\n').find((l) => l.trim() !== '') ?? ''
  if (!H1.test(firstLine)) push('body: must start with "# Title"')
  if (!ROLE.test(body)) push('body: missing "**Role:**" line')

  for (const ref of data.shared_references ?? []) {
    if (!sharedRefs.has(ref)) push(`shared_references: "${ref}" not found in shared/references/`)
  }

  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/schema.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/schema.js test/schema.test.js
git commit -m "feat: skill schema validator"
```

---

### Task 4: Skill discovery + test fixture

**Files:**
- Create: `src/discover.js`
- Create: `test/fixtures/sample/motto.yaml`
- Create: `test/fixtures/sample/skills/hello/SKILL.md`
- Create: `test/fixtures/sample/skills/secret/SKILL.md`
- Create: `test/fixtures/sample/shared/references/voice.md`
- Test: `test/discover.test.js`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 1).
- Produces: `discoverSkills(projectDir: string) -> { skills: Array<{ dirName, dir, data, body }>, sharedRefs: Set<string> }`. Scans `<projectDir>/skills/*/SKILL.md` (skips dirs without a `SKILL.md`). `sharedRefs` = basenames (no `.md`) of `<projectDir>/shared/references/*.md`.

- [ ] **Step 1: Create the fixture project**

```yaml
# test/fixtures/sample/motto.yaml
name: sample
version: 0.1.0
description: a sample motto project
plugins:
  public: sample
  private: sample-pro
```

```markdown
<!-- test/fixtures/sample/skills/hello/SKILL.md -->
---
name: hello
description: use when greeting someone
audience: public
shared_references:
  - voice
---
# Hello

**Role:** You are acting as a friendly greeter.

Say hello, in the shared voice (see references/voice.md).
```

```markdown
<!-- test/fixtures/sample/skills/secret/SKILL.md -->
---
name: secret
description: use for internal-only notes
audience: private
---
# Secret

**Role:** You are acting as an internal note-keeper.

Keep internal notes.
```

```markdown
<!-- test/fixtures/sample/shared/references/voice.md -->
# Voice

Warm, concise, kind.
```

- [ ] **Step 2: Write the failing test**

```js
// test/discover.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { discoverSkills } from '../src/discover.js'

const here = dirname(fileURLToPath(import.meta.url))
const sample = join(here, 'fixtures', 'sample')

test('discovers skills and shared refs', () => {
  const { skills, sharedRefs } = discoverSkills(sample)
  const names = skills.map((s) => s.dirName).sort()
  assert.deepEqual(names, ['hello', 'secret'])
  const hello = skills.find((s) => s.dirName === 'hello')
  assert.equal(hello.data.audience, 'public')
  assert.match(hello.body, /friendly greeter/)
  assert.ok(sharedRefs.has('voice'))
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/discover.test.js`
Expected: FAIL — `Cannot find module '../src/discover.js'`

- [ ] **Step 4: Write the implementation**

```js
// src/discover.js
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from './frontmatter.js'

export function discoverSkills(projectDir) {
  const skills = []
  const skillsDir = join(projectDir, 'skills')
  if (existsSync(skillsDir)) {
    for (const dirName of readdirSync(skillsDir)) {
      const dir = join(skillsDir, dirName)
      if (!statSync(dir).isDirectory()) continue
      const file = join(dir, 'SKILL.md')
      if (!existsSync(file)) continue
      const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'))
      skills.push({ dirName, dir, data, body })
    }
  }

  const refsDir = join(projectDir, 'shared', 'references')
  const sharedRefs = new Set(
    existsSync(refsDir)
      ? readdirSync(refsDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
      : []
  )

  return { skills, sharedRefs }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/discover.test.js`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/discover.js test/fixtures test/discover.test.js
git commit -m "feat: skill discovery + sample fixture"
```

---

### Task 5: Lint orchestration + `motto lint` CLI

**Files:**
- Create: `src/lint.js`
- Create: `bin/motto.js`
- Test: `test/lint.test.js`

**Interfaces:**
- Consumes: `discoverSkills` (Task 4), `validateSkill` (Task 3).
- Produces: `lint(projectDir: string) -> { ok: boolean, errors: Array<{ skill, message }>, count: number }`. `count` = number of skills discovered.
- CLI: `motto lint` validates `process.cwd()`, prints `✓ N skills OK` and exits 0 on success, or prints each `✗ <skill>: <message>` and exits 1.

- [ ] **Step 1: Write the failing test**

```js
// test/lint.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { lint } from '../src/lint.js'

const here = dirname(fileURLToPath(import.meta.url))
const sample = join(here, 'fixtures', 'sample')

test('clean fixture project passes lint', () => {
  const result = lint(sample)
  assert.equal(result.ok, true)
  assert.equal(result.count, 2)
  assert.deepEqual(result.errors, [])
})

test('reports errors for a broken skill', () => {
  const dir = mkdtempSync(join(tmpdir(), 'motto-lint-'))
  const skillDir = join(dir, 'skills', 'broken')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    '---\nname: broken\naudience: nope\n---\nno title\n'
  )
  const result = lint(dir)
  assert.equal(result.ok, false)
  const msgs = result.errors.map((e) => e.message).join('\n')
  assert.match(msgs, /missing description/)
  assert.match(msgs, /audience must be public\|private/)
  assert.match(msgs, /must start with "# Title"/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/lint.test.js`
Expected: FAIL — `Cannot find module '../src/lint.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/lint.js
import { discoverSkills } from './discover.js'
import { validateSkill } from './schema.js'

export function lint(projectDir) {
  const { skills, sharedRefs } = discoverSkills(projectDir)
  const errors = []
  for (const skill of skills) {
    errors.push(...validateSkill(skill, sharedRefs))
  }
  return { ok: errors.length === 0, errors, count: skills.length }
}
```

```js
// bin/motto.js
#!/usr/bin/env node
import { lint } from '../src/lint.js'
import { build } from '../src/build.js'

const [cmd] = process.argv.slice(2)
const cwd = process.cwd()

function printErrors(errors) {
  for (const e of errors) console.error(`✗ ${e.skill}: ${e.message}`)
}

if (cmd === 'lint') {
  const result = lint(cwd)
  if (result.ok) {
    console.log(`✓ ${result.count} skills OK`)
    process.exit(0)
  }
  printErrors(result.errors)
  process.exit(1)
} else if (cmd === 'build') {
  try {
    const result = build(cwd)
    console.log(`✓ built → ${result.outDir}`)
  } catch (err) {
    if (err.lint) printErrors(err.lint.errors)
    else console.error(err.message)
    process.exit(1)
  }
} else {
  console.error('usage: motto <lint|build>')
  process.exit(1)
}
```

Note: `bin/motto.js` imports `build` (Task 6). Until Task 6 lands, `motto build` will throw at import; `motto lint` and all unit tests work. Task 6 completes the wiring.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/lint.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS (all tests so far). `bin/motto.js` is not imported by tests, so the missing `build.js` does not break the suite.

- [ ] **Step 6: Commit**

```bash
git add src/lint.js bin/motto.js test/lint.test.js
git commit -m "feat: lint orchestration + motto lint CLI"
```

---

### Task 6: Build — bundle + emit plugins

**Files:**
- Create: `src/build.js`
- Test: `test/build.test.js`

**Interfaces:**
- Consumes: `lint` (Task 5), `discoverSkills` (Task 4), `loadConfig` (Task 2).
- Produces: `build(projectDir: string, outDir?: string) -> { ok: true, outDir: string }`. Default `outDir` = `<projectDir>/dist`. Throws an `Error` with a `.lint` property (`{ ok, errors, count }`) when lint fails — nothing is written. On success: wipes `outDir`, copies each skill folder verbatim into `dist/<audience>/<dirName>/`, copies each declared shared reference into that skill's `references/`, and writes `dist/<audience>/.claude-plugin/plugin.json` (`{ name, version, description }`). The `private` bucket is written only if private skills exist **and** `config.plugins.private` is set.

- [ ] **Step 1: Write the failing test**

```js
// test/build.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdtempSync, cpSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { build } from '../src/build.js'

const here = dirname(fileURLToPath(import.meta.url))
const sample = join(here, 'fixtures', 'sample')

function copySample() {
  const dir = mkdtempSync(join(tmpdir(), 'motto-build-'))
  cpSync(sample, dir, { recursive: true })
  return dir
}

test('builds public and private plugins with bundled refs', () => {
  const dir = copySample()
  const out = join(dir, 'dist')
  const result = build(dir, out)
  assert.equal(result.ok, true)

  // public skill copied
  assert.ok(existsSync(join(out, 'public', 'hello', 'SKILL.md')))
  // shared ref bundled into the public skill
  assert.ok(existsSync(join(out, 'public', 'hello', 'references', 'voice.md')))
  // public plugin.json named from config
  const pub = JSON.parse(readFileSync(join(out, 'public', '.claude-plugin', 'plugin.json'), 'utf8'))
  assert.equal(pub.name, 'sample')
  assert.equal(pub.version, '0.1.0')

  // private skill + plugin emitted (config has plugins.private)
  assert.ok(existsSync(join(out, 'private', 'secret', 'SKILL.md')))
  const priv = JSON.parse(readFileSync(join(out, 'private', '.claude-plugin', 'plugin.json'), 'utf8'))
  assert.equal(priv.name, 'sample-pro')

  // SKILL.md copied verbatim (frontmatter not stripped)
  assert.match(readFileSync(join(out, 'public', 'hello', 'SKILL.md'), 'utf8'), /audience: public/)
})

test('refuses to build when lint fails and writes nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'motto-build-bad-'))
  const { mkdirSync, writeFileSync } = await import('node:fs')
  mkdirSync(join(dir, 'skills', 'broken'), { recursive: true })
  writeFileSync(join(dir, 'skills', 'broken', 'SKILL.md'), '---\nname: broken\n---\nno title\n')
  writeFileSync(join(dir, 'motto.yaml'), 'name: x\nversion: 0.1.0\ndescription: d\nplugins:\n  public: x\n')
  assert.throws(() => build(dir, join(dir, 'dist')), (err) => err.lint && err.lint.ok === false)
  assert.equal(existsSync(join(dir, 'dist')), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/build.test.js`
Expected: FAIL — `Cannot find module '../src/build.js'`

- [ ] **Step 3: Write the implementation**

```js
// src/build.js
import { mkdirSync, copyFileSync, cpSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { lint } from './lint.js'
import { discoverSkills } from './discover.js'
import { loadConfig } from './config.js'

export function build(projectDir, outDir = join(projectDir, 'dist')) {
  const result = lint(projectDir)
  if (!result.ok) {
    const err = new Error('lint failed; build aborted')
    err.lint = result
    throw err
  }

  const config = loadConfig(projectDir)
  const { skills } = discoverSkills(projectDir)
  rmSync(outDir, { recursive: true, force: true })

  const buckets = { public: [], private: [] }
  for (const skill of skills) buckets[skill.data.audience].push(skill)

  for (const audience of ['public', 'private']) {
    const list = buckets[audience]
    if (list.length === 0) continue
    if (audience === 'private' && !config.plugins.private) continue

    const bucketDir = join(outDir, audience)
    for (const skill of list) {
      const dest = join(bucketDir, skill.dirName)
      cpSync(skill.dir, dest, { recursive: true })

      const refs = skill.data.shared_references ?? []
      if (refs.length) {
        const destRefs = join(dest, 'references')
        mkdirSync(destRefs, { recursive: true })
        for (const ref of refs) {
          copyFileSync(
            join(projectDir, 'shared', 'references', `${ref}.md`),
            join(destRefs, `${ref}.md`)
          )
        }
      }
    }

    const pluginName = audience === 'public' ? config.plugins.public : config.plugins.private
    const manifestDir = join(bucketDir, '.claude-plugin')
    mkdirSync(manifestDir, { recursive: true })
    writeFileSync(
      join(manifestDir, 'plugin.json'),
      JSON.stringify(
        { name: pluginName, version: config.version, description: config.description },
        null,
        2
      )
    )
  }

  return { ok: true, outDir }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/build.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full suite + smoke-test the CLI**

Run: `node --test`
Expected: PASS (all tests).

Run: `node bin/motto.js lint` from inside `test/fixtures/sample`:
```bash
cd test/fixtures/sample && node ../../../bin/motto.js lint && cd -
```
Expected: `✓ 2 skills OK`

- [ ] **Step 6: Commit**

```bash
git add src/build.js test/build.test.js
git commit -m "feat: build — bundle shared refs + emit plugins"
```

---

## Self-Review

**Spec coverage:**
- Strict frontmatter schema → Task 3 (`validateSkill`). ✓
- Title + Role spine, mandatory → Task 3 (H1 + `**Role:**` checks). ✓
- `audience` binary, name=kebab+folder → Task 3. ✓
- Single shared scope (`shared/references/`), bundled at build → Task 4 (discovery) + Task 6 (copy). ✓
- `motto.yaml` config: identity + plugin names, private optional → Task 2 + Task 6. ✓
- Output = standard skills, no stripping (verbatim copy) → Task 6 + asserted in build test. ✓
- `lint` (the core) + `build` (lint-first, refuses on failure) → Task 5 + Task 6. ✓
- Self-contained dist (refs copied in) → Task 6. ✓
- Deferred items (templates, tone, datasets, forms, sub-skills, MCP-dep resolution, scaffold, `--zip`, distribution/install) → intentionally absent; `template` accepted but unvalidated per Global Constraints. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every test shows real assertions. ✓

**Type consistency:** `parseFrontmatter → {data, body}` used consistently in discover/config. `validateSkill(skill, sharedRefs)` signature matches Task 5 call. `discoverSkills → {skills, sharedRefs}` matches lint + build usage. `build` throws `err.lint` shape `{ok, errors, count}` matching `lint`'s return and the CLI's `err.lint.errors` access. `skill` shape `{dirName, dir, data, body}` consistent across discover → schema → build. ✓
