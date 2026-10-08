# Manual

Every page here covers one LunyScript feature. Each one opens with the shortest script that uses
the feature, explains what the feature is for, then lists what you can write. Each page ends with
links to the next page and to the generated
[API Reference](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/), which carries the full signature of every member.

## Start here

- [Introduction](https://codesmile-0000011110110111.github.io/LunyScript-Docs/) — one `Build()` body, the API in highlights, and one
  line from each feature.
- [Writing a script](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/writing-a-script.html) — the class you write, the
  method you override, and how a script reaches a game object.
- [Compile-time checks](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/compile-time-checks.html) — the mistakes the
  compiler reports on the line, from LUNY001 to LUNY009, and what to write instead.
- [Debugging a running script](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/debugging-a-running-script.html) — the
  Debugger window: which blocks ran, the branch each `If` took and how long ago, and changing a value
  while the game runs.
- [Drawing a script as a graph](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/drawing-a-script.html) — the Visualize
  button: the script's events, state machines and behaviour trees drawn with Graphviz.
- [Writing to the Console](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/writing-to-the-console.html) —
  `Debug.Log`, `Debug.Warn` and `Debug.Error`, and the variable, value, script and object each line
  names.
- [AI agent skills](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/agent-skills.html) — the skills that teach Claude
  Code, Codex and Grok to write LunyScript, and the skill links the Install LunyScript AI Skills box asks to install.

## Values and state

- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — numbers, flags,
  text, vectors and rotations, the arithmetic on them, how two objects share one value, and how one
  block puts a group of them back to their declared values.
- [Lists and maps](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/lists-and-maps.html) — fixed-capacity collections
  and the loop that visits them.
- [Random numbers](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/random-numbers.html) — named streams that produce
  the same draws again from the same seed.
- [Reading scripts from C#](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html) — find the
  script an object runs from a `MonoBehaviour`, read its variables and follow their changes.

## Running blocks

- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) — the
  object's lifetime and ticks, and creating or removing objects.
- [Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) — `On.Message`, sending from C#, and
  asking the authority to act.
- [Talking to other scripts](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/talking-to-other-scripts.html) — read
  another object's script, ask it with a request it declares, hear its events, share its gates,
  and run a script once per game.
- [Object pools](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/object-pools.html) — reuse copies of a prefab: declare a
  pool, spawn from it, despawn back into it, and cap how many it holds.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — branching,
  repeating on a cadence, running steps in order or at the same time, and waiting between them.
- [Choosing between options](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/choosing-between-options.html) — score
  several actions each frame and run the winner.
- [State machines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/state-machines.html) — keep an object in one of a
  few named states, with what each state does on entry, while current and on exit, and when it moves.
- [Behaviour trees](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/behaviour-trees.html) — try options in order and fall
  back when one fails: Task and Check leaves, composites, wrappers and Repeat, started as one tree.
- [Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html) — the game clock,
  which scripts keep running while the game is paused, and suppressing input or camera writes.

## Moving objects

- [Transform](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/transform.html) — writing position, rotation and scale
  directly, and walking the hierarchy.
- [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) — moving an object through its
  CharacterController or its Rigidbody.
- [Navigation](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/navigation.html) — sending an object along a route
  around walls, pausing and stopping it, and reading whether it arrived.
- [Follow and lead](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/follow-and-lead.html) — keeping an object within a
  range of another, leading another to a place and waiting when it falls behind, directly or along routes.
- [Physics](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/physics.html) — collision and trigger contact, and
  `Other`, the collider on the far side.
- [Collision queries](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/collision-queries.html) — casting a ray or a
  shape from an object, testing the volume around it, and drawing what each query tested.

## Drawing objects

- [Showing, hiding and tinting objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/showing-hiding-and-tinting.html) —
  stop drawing an object while it keeps running, flash its colour, and write a number its shader
  exposes, without changing the material.

## Players, content and peers

- [Player input](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/player-input.html) — per-player actions, action
  watches, local players pairing and leaving, rebinding and the cursor.
- [Cameras and viewports](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/cameras-and-viewports.html) — which camera
  a view renders, split-screen viewports, a split screen laid out from the paired local players, and
  what a camera rig follows.
- [User interface](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/user-interface.html) — binding values to named UI
  Toolkit elements, reacting to buttons and controls, placing a fragment, keeping a label over a
  point in the scene, and opening a menu.
- [Looking at and using objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/interaction.html) — what each local player
  focuses with the cursor or the centre of the view, a highlight shared by every player, a prompt per
  player, using an object once per frame, and preparing objects in the Editor.
- [Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html) — `Bind.Object()`:
  the object the Inspector assigns or the scene's object of that name, and a binding with no object.
- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) — declaring the
  assets a script uses, loading them, and observing work that takes more than one frame.
- [Custom data and files](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/custom-data-and-files.html) — a struct of
  game data each object copies, data read from an asset, and text, JSON, PNG and WAV files.
- [Saving progress and settings](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/saving-progress-and-settings.html) —
  documents that keep variables between sessions on the player's device, and changing them between
  versions.
- [Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html) —
  reading the session, synchronising state at a chosen cadence, authority events and stored values.
