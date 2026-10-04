# Compile-time checks

LunyScript checks your scripts while Unity compiles them. A mistake that would otherwise fail when
the script type is built, or would silently do nothing, is reported on its own line in the Console
and in your IDE, with an ID you can look up here:

```csharp
public sealed partial class Guard : Script
{
    protected override void Build()
    {
        Health = Define.Number(nameof(Health), 100);

        if (Health > 10)                       // LUNY002: an error
            On.Update(Health.Subtract(1));

        Transform.MoveBy(1, 0, 0);             // LUNY005: a warning

        On.Update(If(Health > 10).Then(Health.Subtract(1)));
        On.Ready(Transform.MoveBy(1, 0, 0));
    }
}
```

The last two lines are the forms the first two meant. The checks ship in the same DLL as the
generator that writes your variable properties, so there is nothing to install or enable.

| ID | Severity | What it reports |
| --- | --- | --- |
| [LUNY001](#luny001) | Error | A variable or asset declaration the generator cannot complete. |
| [LUNY002](#luny002) | Error | A condition used as a C# `bool`. |
| [LUNY003](#luny003) | Warning | A variable whose name hides one of the script's own surfaces. |
| [LUNY004](#luny004) | Error | A builder written as a statement before it is finished. |
| [LUNY005](#luny005) | Warning | A block or a behaviour-tree node written as a statement, where nothing runs it. |
| [LUNY006](#luny006) | Warning | Unity engine API called from inside a script. |
| [LUNY007](#luny007) | Error | A `Wait` or an `InParallel` group written where nothing waits for it. |
| [LUNY008](#luny008) | Warning | A script in an assembly definition that references the Unity engine. |
| [LUNY009](#luny009) | Warning | A member whose name the generated reader or descriptors of another script need. |

## LUNY001: a declaration the generator cannot complete {#luny001}

The generator writes a property for each `Define` line, each `Bind` line and each `[Variable]` or
`[Asset]` property. When it cannot, it says why and what to write instead: the class is not `partial`, the
`nameof` names a different property, the variable is used above the line that declares it, a
second line declares the same name, or the line declares a value no variable holds, such as
`Var.Define<int>`: a variable holds a `Number`, `Flag`, `Text`, `Vector3`, `Vector2`, `Rotation`,
`Color` or one of your enums.

```csharp
public sealed class Guard : Script  // LUNY001: Add partial to class Guard
```

A [state machine](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/state-machines.html) line declares several handles
at once, and each name is matched to the `nameof` in the same position, so the error names the
position that does not match:

```csharp
(Phases, Calm, Angry) = Define.StateMachine(nameof(Phases))
    .WithStates(nameof(Angry), nameof(Calm));
    // LUNY001: Pass nameof(Calm) as name 2 of this line
```

It also writes the members of a [data schema](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/custom-data-and-files.html)
and the reader of a class with `[LunyScriptDataField]` fields, and reports a field it cannot hold:

```csharp
[LunyScriptData]
public partial struct WeaponStats
{
    public int[] Upgrades;  // LUNY001: the field's type is int[]
}
```

Where your IDE offers code fixes from the project's analyzers, it offers **Add partial** on this
error. The fix adds `partial` to the class, and to every class it is nested in that needs it. The
compiler reports the error and applies no fix, so in Unity alone you add `partial` yourself.

## LUNY002: a condition used as a C# `bool` {#luny002}

`Build()` composes blocks once, and the blocks run later, on every object that runs the script. A
C# `if`, `while`, `for`, `do`, `?:`, a `bool` variable or a `(bool)` cast would have to decide a
condition while `Build()` runs, when there is no object to ask. The message names the values the
condition reads:

```csharp
if (Health > 10) { }        // Blocks (here: Health) cannot be compared
                            // outside block sequences
bool alive = Alive.IsTrue();  // the same error, here: Alive
```

Pass the condition to `If(...)` instead. `&&`, `||`, `&`, `|` and `!` between conditions build one
combined condition, so they are not reported:

```csharp
On.Update(If(Health > 10 && Alive).Then(Health.Subtract(1)));
```

The same line also throws when the script type is built, in every build configuration.

## LUNY003: a name that hides a script surface {#luny003}

`Time`, `Object`, `Input`, `Run`, `Seconds`, `Progress` and every other surface you call inside
`Build()` are members of the script. A property or field with the same name hides that member
inside the script, so `Time.Delta` stops compiling there:

```csharp
[Variable] public Number Time { get; private set; }   // LUNY003
```

A `Define` line that uses a surface's name cannot declare a variable at all, because the name
already means the surface. The compiler reports that the member is read-only or a method, and
LUNY003 on the same line says why:

```csharp
Progress = Define.Number(nameof(Progress), 0);  // LUNY003
```

Name the variable after what it holds, such as `RoundTime` or `LevelProgress`. A declaration
written with `new` hides the surface on purpose and is not reported.

## LUNY004: a builder that is not finished {#luny004}

A call such as `When.Operation(Load)` or `If(Alive)` starts a builder, and the builder does nothing
until its chain is finished. Written as a statement on its own, it is reported with the call that
started it and what is still missing:

```csharp
When.Operation(Load);  // Builder (here: When.Operation(..)) is
                       // incomplete: it does not have blocks to run
Scene.Load(Arena);     // Builder (here: Scene.Load(..)) is
                       // incomplete: finish it with .Additive() or .As(..)
```

Finish the chain, and pass it to an event where it is a block:

```csharp
When.Operation(Load).Failed(Health.Set(0));
On.Ready(Scene.Load(Arena).As(Load));
```

The script type is also refused when it is built, naming the builder and the line. That refusal
still covers a builder that is stored in a variable or returned from a method and never finished,
which the compile-time check does not follow.

## LUNY005: a block that nothing runs {#luny005}

A block runs only when it is registered against an event or placed in a sequence. Written as a
statement, it is composed and then dropped:

```csharp
Transform.MoveBy(1, 0, 0);  // Builder (here: Transform.MoveBy(..))
                            // block is unused, it will not run
Health.Set(0);              // Block (here: Health.Set(..)) is unused,
                            // it will not run
```

Pass it to an event, or keep it in a variable and pass that:

```csharp
var step = Transform.MoveBy(1, 0, 0);
On.Update(step);
```

A builder written this way, such as `Transform.MoveBy(..)`, is also refused when the script type is
built. A finished block such as `Health.Set(0)` is not, so this warning is the only report of it.

A behaviour-tree node runs only where a tree holds it, so a node written as a statement is reported
the same way:

```csharp
Task(Health.Set(0));        // Node (here: Task(..)) is unused,
                            // it will not run
InOrder(a, b);              // Builder (here: InOrder(..)) node is
                            // unused, it will not run
```

## LUNY006: Unity engine API inside a script {#luny006}

An engine call inside a script acts on the whole game, not on the object the script runs on: it
can change the time scale, load a scene, or destroy an object LunyScript manages. The warning reads
`LunyScript: UnityEngine.Time.timeScale is Unity engine API.` and names the member with its namespace, so a
script surface and an engine class with the same name are told apart:

```csharp
UnityEngine.Time.timeScale = 0f;  // LUNY006
On.Ready(Time.SetScale(0));       // the LunyScript surface
```

Every member of the `UnityEngine`, `UnityEditor` and `Unity` namespaces is reported inside a class
derived from `Script`, `EditorScript` or `ScriptBase`, including its helper methods and property
getters. Engine types in declarations, such as a field of type `UnityEngine.Texture2D`, and
attributes are not calls and are not reported. Code in other classes is not checked, so the
warning is a hint for the common case. LunyScript's own `Vector2`, `Vector3` and `Debug` carry the
names of Unity's types and are declared in `CodeSmile.LunyScript`, so a script's use of them is
never reported.

## LUNY007: a wait or a group where nothing waits for it {#luny007}

A `Wait` and an `InParallel` group finish over several frames, so they need an owner that waits for them: a routine, a group, a `Run`
body or a `Choose` option's action. `Then`, `Else`, an `On.*` event list and a state machine's `Enter`, `Update`, `Exit` and `Do` run
all of their blocks in the frame they are reached, so a wait or a group written directly in one of them is reported on its line:

```csharp
On.Ready(Routine("Blink").Run(
    If(ShouldBlink).Then(Wait(1))));   // Wait (here: Wait(..)) inside Then cannot
                                       // wait, Then runs its blocks in the frame it
                                       // is reached: move the Wait out of Then so
                                       // that it is a step of a routine
On.Update(Wait(1));               // Wait (here: Wait(..)) in an event list
                                       // cannot wait, ...: make it a step of a
                                       // routine, as in Routine("name").Run(Wait(..))
```

Move the wait out of `Then` so that it is a step of the routine. To wait only when the condition holds, set a `Number` inside `Then`
and give it to a wait after the `If`, as [Flow](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) shows under "Where a wait goes".

A sequence written directly in one of those lists, `Sequence(...)` or a tuple of blocks, runs its blocks there, so a wait or a group
written inside it is reported the same way, and the fix moves the sequence:

```csharp
On.Update((Lamp.Set(true), Wait(1)));
// Wait (here: Wait(..)) in a sequence in an event list cannot wait, ...:
// make the sequence a step of a routine, as in
// Routine("name").Run(Sequence(..))
```

The script type is also refused when it is built, naming the line of the wait, or for a group the line of the `If` that holds it. That
refusal covers a wait stored in a variable or returned from a method and then placed in `Then`, which the compile-time check does not
follow, a wait in a sequence held in a variable or declared with `Define.Sequence`, and a wait in a `When.*` body or a `ForEach` body.

## LUNY008: a script in an assembly definition that references the engine {#luny008}

A script names no engine type: its inputs are LunyScript's own `Texture2D`, `AudioClip`, `Prefab`
and the other input kinds, and its objects are `Bind.Object()` bindings. An assembly definition
with **No Engine References** checked keeps it that way, because an engine type there does not
compile. A script in an assembly definition that references the engine is reported on its class,
with the assembly definition's name:

```csharp
public sealed partial class Turret : Script // LUNY008: Turret is in
{                                           // the assembly definition
    protected override void Build() {}      // Game.Scripts, which
}                                           // references the Unity engine
```

Check **No Engine References** on that assembly definition, and keep MonoBehaviours and other code
that uses the engine in a second assembly definition that references the first. A script with no
assembly definition compiles into `Assembly-CSharp` and is not reported, and neither is an
`EditorScript`. An assembly that has to keep scripts beside engine code, such as a test assembly,
turns the warning off for the whole assembly:

```csharp
[assembly: System.Diagnostics.CodeAnalysis.SuppressMessage(
    "LunyScript", "LUNY008", Justification = "Test scripts")]
```

## LUNY009: a name the generated access to a script needs {#luny009}

The generator writes `At(target)` and its `Reader` into a script with a public variable, and the
`Requests`, `Events` and `Gates` classes into a script that declares one, so other scripts can
[read and ask it](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/talking-to-other-scripts.html). A member of the
script that already has one of those names keeps it, and the generator writes nothing in its
place:

```csharp
public sealed partial class Radio : Script
{
    public const string At = "At";
    protected override void Build()
    {
        // LUNY009: Radio declares a member named At, so no Radio.At
        Volume = Define.Number(nameof(Volume), 1);
    }
}
```

The warning is reported on the script's first declaration line.

A public variable named `IsRunning` is left off the reader, because the reader's own `IsRunning`
check has that name. Rename the member to make the script readable from other scripts.

## Turning a check off for a few lines

LUNY002 to LUNY009 are ordinary compiler diagnostics, so `#pragma warning` turns one off around the
lines that need it and on again after them:

```csharp
#pragma warning disable LUNY005
Transform.MoveBy(1, 0, 0);
#pragma warning restore LUNY005
```

## What to read next

- [Writing a script](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/writing-a-script.html) — the class, `Build()`,
  and the surfaces a script calls.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — `If`,
  combined conditions and the blocks that run in order.
