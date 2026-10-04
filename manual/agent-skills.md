# AI agent skills

LunyScript ships skills that teach AI coding agents, such as Claude Code, Codex and Grok, to write
LunyScript scripts. A skill is a folder with one `SKILL.md` file: a name, a one-line description of
when to use it, and the instructions. The instructions name the other files in the folder, each with
the task it is for, so an agent opens only those its task needs. One of them, `api.md`, lists the
signatures of the family, and `api-index.md` in the `lunyscript` folder lists every such file.
`api-types.md` beside it gives the file and lines of each type, so an agent that searches it for a
member or type name reads only that type's lines. The skills are in your project at
`Assets/CodeSmile/LunyScript/AgentSkills/`, and they match the LunyScript version you installed:
every C# example in them compiles against that version, and the signature files are generated from it.

An agent finds a skill only in its own skill folders. When you allow it, LunyScript writes a short
**skill link** for each skill into those folders, and keeps the links up to date.

## The skills

| Skill | An agent loads it when a script |
| --- | --- |
| `lunyscript` | is written or changed at all: `Build()`, variables, events, conditions, errors, attaching it from Editor C#, reading it from C# |
| `lunyscript-transform` | places, turns, orbits, aims or reparents an object directly |
| `lunyscript-motion` | moves a body at a speed or over time, once or again, pushes bodies with an explosion, switches body mode, or flocks children |
| `lunyscript-objects` | creates, pools, spawns, reuses, destroys, binds, hides or tints objects |
| `lunyscript-audio` | plays clips or controls an `AudioSource` |
| `lunyscript-particles` | plays, stops or bursts a `ParticleSystem` |
| `lunyscript-input` | reads Input System actions |
| `lunyscript-interaction` | lets local players focus, highlight and use objects, with a prompt per player |
| `lunyscript-ui` | writes to or reacts to a UI Toolkit panel |
| `lunyscript-save` | saves or loads values on the device or in Cloud Save, or installs a Cloud Save provider of its own |
| `lunyscript-data` | reads tuning values from a data asset or a JSON file |

## Allowing the skill links

**Tools > LunyScript > Welcome** opens the welcome window. It also opens by itself once each time
you open the project, until you tick **Don't show again**; that choice is yours alone, kept in
the project's `UserSettings` folder.

After the welcome window opens, and while no skill link exists, a message box titled **Install
LunyScript AI Skills** asks:

> LunyScript includes AI agent skills. To ensure agents find and use the LunyScript skills, we need
> to create .agents/skills/lunyscript* and .claude/skills/lunyscript* in the project's root. These
> redirecting skills guide AI agents to use the actual LunyScript skills located in
> Assets/CodeSmile/LunyScript/AgentSkills/lunyscript*
>
> Allow LunyScript to install the links to its AI agent skills?

**Yes** writes one link per skill, in a folder named after the skill, in each of these folders of
your Unity project. **No** writes nothing.

| Folder | Read by |
| --- | --- |
| `.claude/skills/` | Claude Code, and Grok |
| `.agents/skills/` | Codex, and Grok |

LunyScript keeps your answer in `UserSettings/LunyScriptAgentSkills.asset`, yours alone like the
**Don't show again** choice. When the welcome window opens by itself, the box asks only until you
answer it once. When you open the welcome window from **Tools > LunyScript > Welcome**, the box asks
again while no skill link exists, so you can still answer **Yes** after an earlier **No**. The box
never appears when the Editor runs in batch mode.

Start your agent in the Unity project folder, the one that holds `Assets`, or in a folder inside
it:

- **Claude Code** lists the skills in `.claude/skills/` of the folder it starts in and of every
  folder above it.
- **Codex** lists the skills in `.agents/skills/` of the folder it starts in and of every folder
  above it up to the root of the Git repository. Outside a Git repository it reads only the folder
  it starts in.
- **Grok** lists both folders, walking up the way Codex does, once you trust the project folder. It
  asks the first time it starts there; `grok --trust` grants it without the question. Until then it
  lists no project skill.

Each agent then loads a skill by itself when your request matches the skill's description. Asked to
"add a LunyScript script" that moves an object toward a point, with no mention of skills, Claude Code
2.1.285, Codex CLI 0.155.1 and Grok 1.0.44 each loaded `lunyscript` and `lunyscript-motion` and read
both files under `Assets` before writing the script.

## What a skill link is

A link is a `SKILL.md` that carries the skill's own name and description, so the agent lists it,
and one instruction: read the skill's file under `Assets`. The link for the core skill in
`.claude/skills`, with its long lines shortened here:

```text
---
name: lunyscript
description: Write, change, review or explain a LunyScript script ...
---

<!-- Written by LunyScript to make its lunyscript skill discoverable
here. LunyScript updates this file and deletes it on request; an edit
stops both. -->

The lunyscript skill ships with LunyScript in this Unity project. Read
`Assets/CodeSmile/LunyScript/AgentSkills/lunyscript/SKILL.md`, a path
relative to the Unity project folder that holds this `.claude` folder,
and follow it. Paths inside that file are relative to its own folder.
<!-- lunyscript-skill-link sha256:35ad9e19...9a7ac4 -->
```

The link is plain text, identical on every machine, so you can commit it or ignore it. It is not a
symbolic link, so it needs no permission on Windows.

## Your own files stay as they are

The last line of a link carries a SHA-256 hash of the text above it. That line is the only way
LunyScript recognises a file as its own. Before it writes, rewrites or deletes anything, LunyScript
checks the path, and leaves exactly as it is:

- a file or folder with a skill's name that it did not write, such as your own skill called
  `lunyscript`;
- a link you edited, from the moment you edit it;
- a link folder that holds any file besides its `SKILL.md`;
- a file where a folder would go, such as a file named `.agents`;
- a symbolic link or junction anywhere on the path, which it does not follow.

Each of those is listed as a warning in the Console, and every other link is still written. A file
that only has a skill's name is never taken as permission to write.

## Updates and repairs

While at least one link LunyScript recognises as its own exists, it repairs and updates the links,
without asking, each time the Editor loads scripts: after you import a newer LunyScript, it
rewrites a link whose skill changed, writes a link for a new skill, rewrites a link you deleted, and
deletes the link of a skill that no longer ships. A folder where no link exists is written only after
you answer **Yes** in the Install LunyScript AI Skills box.

## Removing the links

Delete the folder `lunyscript` and every folder whose name starts with `lunyscript-` from
`.claude/skills/` and `.agents/skills/`. With no link left that LunyScript recognises as its own, it writes nothing
until you answer **Yes** in the box again. Delete `.claude`, `.claude/skills`, `.agents` and
`.agents/skills` as well if you have no other use for them; LunyScript records in
`UserSettings/LunyScriptAgentSkillFolders.txt` which of them it created.

Remove the links before you remove LunyScript from a project. A link left behind names a file that
no longer exists, and the agent then has nothing to read.

## Without the links

- Tell the agent where the skill is: "read
  `Assets/CodeSmile/LunyScript/AgentSkills/lunyscript/SKILL.md` first".
- Or copy a skill's folder into a skill folder your agent reads, such as `~/.claude/skills/` for
  every project of one user. A copy does not update with LunyScript.

## What to read next

- [Writing a script](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/writing-a-script.html) — the class the `lunyscript`
  skill teaches.
- [Compile-time checks](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/compile-time-checks.html) — the errors an agent
  sees when it writes a script wrong.
