# Writing a script

A LunyScript script is one C# class with one method in it. This is a whole working script:

```csharp
using CodeSmile.LunyScript;

public sealed class Spinner : Script
{
    protected override void Build() =>
        On.Update(Transform.RotateBy(0, 0, 35 * Time.Delta));
}
```

Select a GameObject, choose **Add Component → LunyScript → LunyScript Behaviour**, and pick
`Spinner` in the component's **Script To Run** field. Press Play and the object turns 35 degrees per
second. That is the whole setup: one file, one component, one field.

## What `Build` does

`Build()` composes blocks. A block is one unit of work — `Transform.RotateBy(...)`,
`Charge.Add(5)`, `If(...).Then(...)` — and composing it records that the work exists. The work runs
later, when the event it was registered against is raised.

`Build()` runs once for each script type. Ten objects assigned to `Spinner` share the blocks that one
`Build()` call composed; what each object owns is its own copy of the variable values those blocks
read and write. That is why `Build()` takes no object as a parameter and why a block reads a value
through a variable handle instead of holding the value itself.

A surface such as `Transform` or `On` throws when it is touched outside `Build()`. Compose the blocks
in `Build()` and let the events run them. The compiler reports the two most common ways to mix the
two phases up, a condition in a C# `if` and a block written as a statement where nothing runs it,
on the line: [Compile-time checks](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/compile-time-checks.html) lists
every check.

## The three methods you can override

Every script overrides `Build()`. The other two run before it and exist so that generated code has a
place to put declarations.

| Method | When it runs | Who writes it |
| --- | --- | --- |
| `protected override void Build()` | Once per script type. | You. |
| `protected override void DefineVariables()` | Before `Build()`. | The `[Variable]` generator, or you. |
| `protected override void DefineAssets()` | Before `Build()`. | The `[Asset]` generator, or you. |

```csharp
public sealed partial class Battery : Script
{
    // The [Asset] generator writes the DefineAssets override.
    [Asset] public Prefab Spark { get; private set; }

    protected override void Build()
    {
        // The generator writes the Charge property this line assigns.
        Charge = Define.Number(nameof(Charge), 40);

        On.Update(Charge.Subtract(Time.Delta));
        On.Message("Discharge", Object.Create(Spark));
    }
}
```

The class is `partial` because the generators write the other half of it: the `Charge` property that
the `Define.Number` line assigns, and the `DefineAssets` override for `Spark`. A script that declares
its variables and assets on properties it writes itself, with no `[Variable]` or `[Asset]`, and
names each `Bind` line with `As`, is written without `partial`. `Spark` gets its own field on
the `LunyScript Behaviour` component, below the script, and that is where the object assigns a
prefab to it.

## A script is a plain C# class

`Script` and every subclass of it are ordinary C# classes. Unity delivers its own messages to the
`LunyScript Behaviour` component, which is the one object that connects a GameObject to a script
type, and that component is what raises the events described in
[Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html).

Keeping a script off Unity's own object types is why the `Script To Run` field is a managed
reference, chosen from a picker, rather than an object field. The field serializes with the scene or
the prefab, and `Instantiate` copies it.

## Call list

These names are the surfaces you can call inside `Build()`. They are not a script you can paste.
Two base classes exist. `Script` is for a game object. `EditorScript` is for a tool that runs in the
editor, and it offers the surfaces that do not need a running game object.

Available on both `Script` and `EditorScript`:

```csharp
Var  Define  Shared  Bind  When  Math  Random  Operation  Asset
CollectionResult  If(condition)  ForEach(collection)  Routine(name)
InParallel(block, ..)  Run(block, ..)  Choose(subject)  Option(score)
Seconds(n)  Milliseconds(n)  Minutes(n)  Hours(n)
```

Available on `Script` only:

```csharp
On  Transform  Motion  Body  Other  Object  Time  Input  View  Camera  Panel
Animator  Audio  Particles  Scene  Gate  Net  Sync  Cloud  SetProcessMode(mode)
```

## What to read next

- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — declare state
  and write to it.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  lifetime and tick events. [Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) and
  [Physics](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/physics.html) cover `On.Message` and contact.
- Generated reference:
  [`Script`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Script.html),
  [`ScriptBase`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ScriptBase.html),
  [`EditorScript`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.EditorScript.html).
