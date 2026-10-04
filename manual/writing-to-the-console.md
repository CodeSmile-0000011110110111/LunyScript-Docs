# Writing to the Console

Write a variable's value to the Console each time a block runs:

```csharp
using CodeSmile.LunyScript;

public sealed partial class PlayerScript : Script
{
    protected override void Build()
    {
        Health = Define.Number(nameof(Health), 15);

        On.Ready(Debug.Log(Health));
    }
}
```

When the object named Player spawns, the Console shows:

```
Health = 15 (Script: PlayerScript, Object: Player)
```

followed by the line in your script that wrote it, such as
`(at Assets/Scripts/PlayerScript.cs:9)`. The line names the variable, its value on this object at
the moment the block ran, the script and the object. In the Editor the location is a link: clicking
it opens your script at that line. The entry is logged with the object as its context, which Unity
uses to highlight the object in the Hierarchy when you select the entry.

## Three severities

| Block | Console entry |
| --- | --- |
| `Debug.Log(..)` | An ordinary entry. |
| `Debug.Warn(..)` | A yellow warning. |
| `Debug.Error(..)` | A red error. |

An error line is a message, not a failure: the script keeps running and the blocks after it run.
Inside a script, `Debug` means this surface; Unity's own `UnityEngine.Debug` is not reached from
`Build()`.

## What you can write

```csharp
On.Ready(
    Debug.Log("ready"),              // ready
    Debug.Log(Health),               // Health = 15
    Debug.Log(Alive),                // Alive = true
    Debug.Log(PlayerName),           // PlayerName = "Ada"
    Debug.Log(Health + 5),           // 20
    Debug.Log(Health > 10),          // true
    Debug.Log("hit", Health),        // hit: Health = 15
    Debug.Log("next", Health * 2));  // next: 30
```

`Debug.Warn` and `Debug.Error` take the same arguments. A variable shows its name; an expression
such as `Health + 5` has no name, so it shows its value alone. A number is written the way
`Text.Format` writes it, with up to six decimals and no trailing zeros. Text is quoted, so empty
text shows as `""`.

The value is read each time the block runs, for the object it runs on. Placed in
`On.Update`, `Debug.Log(Health)` writes a line every frame, and two objects running the same
script each write their own health and their own name.

## Only while you develop

The blocks write only in the Editor and in a development build. A release build, which Unity makes
when the Development Build option is off, writes nothing and reads no value for them, so leaving a
`Debug.Log` in a script costs a shipped game nothing.

## Common mistakes

```csharp
On.Ready(Debug.Log("HP: " + Health));
```

This compiles and writes the wrong thing. C# joins the text while `Build()` runs, once, from the
handle's description, so every object writes `HP: Health (Number slot 0)`. Pass the value as its
own argument instead:

```csharp
On.Ready(Debug.Log("HP", Health));   // HP: Health = 15
```

A `Debug.Log(..)` written as a statement is never placed in an event, so it never runs; the
compiler reports it as LUNY005. Two strings, `Debug.Log("hit", "full")`, compile, and the second
string takes the place of the file path the compiler records, so the link names `full`; write one
string.

## What to read next

- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — the values a
  line can show.
- [Compile-time checks](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/compile-time-checks.html) — LUNY005 and the
  other mistakes the compiler reports.
- Generated reference:
  [`DebugFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.DebugFactory.html).
