# Upgrading Motto Projects

This file lists breaking changes to Motto's project structure/schema and the
steps an existing Motto-scaffolded project needs to cross each one. Entries
are keyed by the version where the break landed. Versions 0.0.4 and 0.0.5
never shipped to npm, so a project coming from 0.0.3 crosses both entries
below on its way to 0.0.6+.

## v0.0.7 — Adopt the `mottoVersion` stamp

**What breaks:** Nothing breaks — this is not a lint error. Projects
scaffolded before v0.0.7 have no `mottoVersion` key in `motto.yaml`, so
`motto lint`/`motto build` silently skip the version-skew check for them.
Adopting the stamp turns the skew check on for your project.

**Steps:**
1. Open your project's `motto.yaml`.
2. Add a `mottoVersion` key set to the version of `motto` you currently have
   installed (check with `npm ls -g @jeremiewerner/motto` for a global
   install, or `npm ls @jeremiewerner/motto` if installed locally to the
   project).
3. Place it near the existing `version` key — they are distinct fields
   (`version` is your project's own version; `mottoVersion` is the tool
   version your project was last verified against).

**Before:**
```yaml
name: magma
version: "0.1.0"
description: A skills project scaffolded by motto init.
plugins:
  public: magma
```

**After:**
```yaml
name: magma
version: "0.1.0"
mottoVersion: "0.0.7"
description: A skills project scaffolded by motto init.
plugins:
  public: magma
```

**Verify:** `motto lint` — no change in errors; a future skew (when you
upgrade motto again without re-stamping) will now surface as a warning
instead of silently passing.

## v0.0.5 — `**Role:**` bold line → `<role>` section tag

**What breaks:** `motto lint` reports a missing-role error (or, if a
`<role>` tag exists but is empty, an empty-role error) for any SKILL.md
still using the old `**Role:**` bold-line convention. The bold line is no
longer recognized — it becomes inert body text.

**Steps:**
1. In every `skills/<name>/SKILL.md`, find the line starting with
   `**Role:**`.
2. Replace it with a `<role>` … `</role>` block, moving the same
   sentence(s) inside.
3. Run `motto lint` and confirm the role error is gone for that skill.

**Before:**
```markdown
**Role:** You are a guide who walks the author through X step by step.
```

**After:**
```markdown
<role>
You are a guide who walks the author through X step by step.
</role>
```

**Verify:** `motto lint` → no role errors for the migrated skill(s).
