# Showing, hiding and tinting objects

Hide an object, flash it when it is hit, and change a value its shader exposes. The material asset
never changes:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Enemy : Script
{
    protected override void Build()
    {
        Health = Define.Number(nameof(Health), 3);

        On.CollisionEnter(Health.Subtract(1),
            Object.Flash(1, 0.25, 0.25).Over(0.15));
        On.Update(If(Health <= 0).Then(Object.Hide()));
    }
}
```

Put the script on an object that has a `MeshRenderer` and a collider. Each hit draws the object red
for 0.15 seconds of game time, and then the material's own colour again. At zero health the object
is no longer drawn, and its collider and its script keep running.

## Hiding is not deactivating

`Object.Hide()` disables the object's `Renderer`, so the object is not drawn and casts no shadow.
Everything else on it keeps running: colliders, scripts, audio, and its children.
`Object.Show()` enables the renderer again, and `Object.IsVisible` reads whether it is enabled.

`Object.Deactivate()`, on the [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html)
page, deactivates the whole GameObject, which stops all of those as well. Use `Hide` for a pickup
that waits to respawn and `Deactivate` for an object that is gone.

```csharp
On.TriggerEnter(Object.Hide());
Respawn = Define.Message();
On.Message(Respawn, Object.Show());
On.Update(If(Object.IsVisible).Then(Seen.Set(true)));
```

`IsVisible` is the state `Hide` and `Show` write. Unity's `Renderer.isVisible`, which says whether a
camera sees the renderer, is a different reading and is not on this surface.

`Object.SetVisible(condition)` shows the renderer when the condition is true where the block runs
and hides it when the condition is false. It takes a condition or a Flag; `Show()` and `Hide()` are
the forms for a fixed answer.

<pre><code>Health = Define.Number(nameof(Health), 100);
Elite = Define.Flag(nameof(Elite), false);
Crown = Bind.Object();

On.Update(<strong>Object.SetVisible(Health &gt; 0)</strong>);
On.Spawned(<strong>Object.For(Crown).SetVisible(Elite)</strong>);
</code></pre>

## The object's own renderer

These calls reach the one `Renderer` on the object the script runs on. A model imported from a
modelling tool often keeps its meshes on child objects; declare the child you want as an input and
name it with `Object.For`:

```csharp
protected override void Build()
{
    Shield = Bind.Object();
    var shield = Object.For(Shield);

    On.Ready(shield.Hide());
    ShieldUp = Define.Message();
    ShieldDown = Define.Message();
    On.Message(ShieldUp, shield.Show(), shield.SetColor(0.3, 0.6, 1));
    On.Message(ShieldDown, shield.Hide());
}
```

Assign the child to `Shield` in the object's Inspector. With nothing assigned, the binding takes the
first object named `Shield` in the scene, which can be another object's child;
[Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html) has the rules. The handle `Object.For` returns has every call on this
page, and it reaches the renderer on that object only.

## Turning a bound object on and off

`Hide` turns a renderer off and leaves the object running. To turn the whole bound object off - its
colliders, lights, particle systems and its own scripts - use `Activate` and `Deactivate`:

```csharp
Blocker = Bind.Object();
On.Ready(Object.For(Blocker).Activate());
Opened = Define.Message();
On.Message(Opened, Object.For(Blocker).Deactivate());
```

Both apply after the blocks running now have finished, as `Object.Deactivate()` on the script's own
object does, so a script on the bound object receives `On.Disabled` and `On.Enabled` in the ordinary
way. A binding that holds no object does nothing.

## Colour

`Object.SetColor(red, green, blue)` tints the object. The channels run from 0 to 1, as Unity's
`Color` holds them, and each can be a number or any Number expression. The three-number form writes
alpha 1; the four-number form writes the alpha too, which a transparent material uses and an opaque
one ignores. A channel above 1 is allowed, because an HDR colour property uses it as intensity.

```csharp
On.Ready(Object.SetColor(1, 0.8, 0.2));
On.Ready(Object.SetColor(1, 0.8, 0.2, 0.5));
On.Update(Object.SetColor(1, Health / 3, Health / 3));
Healed = Define.Message();
On.Message(Healed, Object.ResetColor());
```

The colour is written to the material's main colour: the colour property its shader marks
`[MainColor]`, or `_Color` when it marks none. That is the property Unity's own `Material.color`
writes, `_BaseColor` on the Universal Render Pipeline's Lit and Unlit shaders. `Object.ResetColor()`
removes the tint, and the material's own colour shows again.

## A colour value

`Object.SetColor` also takes one colour. `Color` is LunyScript's colour type, with Unity's name: four
channels, `R`, `G`, `B` and `A`, each from 0 to 1. A script imports no engine namespace, so `Color`
in a script is this type.

```csharp
var gold = new Color(1, 0.8, 0.2);         // alpha 1
var glass = new Color(0.3, 0.6, 1, 0.5);
glass.A = 0.25;                            // a channel is a field

On.CollisionEnter(Object.SetColor(Color.Red));
Gold = Define.Message();
Glass = Define.Message();
On.Message(Gold, Object.SetColor(gold));
On.Message(Glass, Object.For(Shield).SetColor(glass));
```

`Color.White`, `Black`, `Gray`, `Clear`, `Red`, `Green` and `Blue` hold the channels Unity's own
named colours hold. The channels are `Double`, so a script writes `0.5` and never `0.5f`, and a
channel above 1 is kept for an HDR colour property.

A colour can also come from a data asset. A `Color` field of a `[LunyScriptData]` schema is saved
with the asset, and the script's copy of it is a colour variable `SetColor` reads each time it runs:

```csharp
Team = Bind.Data(TeamLook.Schema);    // TeamLook: Color Tint and Color Flash
Traitor = Define.Message();

On.Ready(Object.SetColor(Team.Tint));
On.CollisionEnter(Object.Flash(Team.Flash).Over(0.15));
On.Message(Traitor, Team.Tint.Set(Color.Green), Object.SetColor(Team.Tint));
```

`Team.Tint.Set(...)` changes this object's copy; the asset keeps its colour. The next section says
how a flash ends.
[Custom data, JSON and text files](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/custom-data-and-files.html) shows the
schema and the asset.

## Flashing on a hit

`Object.Flash(colour).Over(seconds)` draws a colour for an amount of game time, and then draws the
colour the script last wrote with `SetColor` again. It takes the colour forms `SetColor` takes: a
`Color` value, a colour variable, or channel numbers.

<pre><code>Health = Define.Number(nameof(Health), 3);
Healed = Define.Message();
Shield = Bind.Object();

On.Ready(Object.SetColor(0.2, 0.4, 1));
On.CollisionEnter(Health.Subtract(1),
    <strong>Object.Flash(Color.Red).Over(0.1)</strong>);
On.Message(Healed,
    <strong>Object.For(Shield).Flash(0.3, 1, 0.3).Over(250).Milliseconds()</strong>);
</code></pre>

The object starts blue. A hit draws it red, and a tenth of a second later blue again. When the script
wrote no colour before the flash, or its last colour write was `ResetColor()`, the flash ends by
removing the tint, and the material's own colour shows.

- **A colour written during the flash waits for it.** While a flash runs, `SetColor` and
  `ResetColor` on the same object change the colour the flash ends on and draw nothing until then.
  A state colour written in the middle of a hit flash shows when the flash ends.
- **A second flash replaces the first.** Its colour shows at once and its duration counts from then.
- **The duration is game time.** `Over(0.1)` is seconds; `.Milliseconds()`, `.Minutes()` or
  `.Hours()` after it names another unit. The amount is read when the flash starts. A paused game
  holds the flash, and a time scale stretches it.
- **Each object has its own flash.** The object the script runs on and each `Object.For` binding
  flash and restore separately.
- **Only this script's colour writes are restored.** A colour another script or C# writes on the same
  renderer is replaced when the flash ends.

`Object.Flash(Color.Red)` on its own is not a block: a flash needs `Over`. `For` counts repetitions
elsewhere in LunyScript, so `Object.Flash(Color.Red).For(0.1)` does not compile.

## Material numbers

A shader can expose a number such as a dissolve amount or an outline width.
`Object.MaterialNumber(name)` names one by the name in the shader's Properties block, which usually
starts with an underscore:

```csharp
var dissolve = Object.MaterialNumber("_Dissolve");

On.Update(If(Health <= 0).Then(Fade.Add(Time.Delta), dissolve.Set(Fade)));
Revive = Define.Message();
On.Message(Revive, dissolve.Reset());
```

`Set` writes the value, and `Reset` removes it so the material's own value shows again. The property
must be a Float or a Range. Each reset removes only its own value: resetting the colour leaves a
running dissolve in place.

## The material asset stays unchanged

Every call on this page writes into the renderer's `MaterialPropertyBlock`, a set of per-object values
Unity draws with in place of the material's own. The material asset and the renderer's shared material
do not change, so two objects that share a material keep sharing it, and a tint on one never appears on
the other. When the last value is reset the block is removed, and the renderer draws exactly as it did
before.

Unity's documentation states that the SRP Batcher does not batch a renderer while it has a property
block, so an object is drawn outside that batch while a colour or number is set on it.

Writing the same renderer's property block from C# is outside what LunyScript supports on an object it
runs. A reset rebuilds the block from the properties the renderer's shaders declare, so a value written
under any other name is removed.

## When the renderer or the property is missing

The object still runs. The first call that finds no renderer, no main colour or no property of that
name writes one error to the Console, naming the script, the object and the property, and after that
the calls do nothing. A colour channel that is negative, not a number or larger than the largest
`Single`, 3.4028235E+38, a material number that is not finite, and a flash duration that is negative,
not a number or infinite, are refused the same way.

## Call list

These lines are call signatures, not a script you can paste. Brackets mark an argument you may leave
out.

```csharp
Object.Hide()
Object.Show()
Object.SetVisible(condition)                 // a condition or a Flag
Object.IsVisible
Object.SetColor(red, green, blue [ , alpha ])
Object.SetColor(colour)                      // a Color or a colour variable
Object.ResetColor()
Object.Flash(colour).Over(seconds)           // a Color or a colour variable
Object.Flash(red, green, blue [ , alpha ]).Over(seconds)
Object.Flash(colour).Over(amount).Milliseconds()  // or Seconds, Minutes, Hours
Object.MaterialNumber(name).Set(value)
Object.MaterialNumber(name).Reset()
Object.For(target).Hide()                    // and every call above
Object.For(target).Activate()
Object.For(target).Deactivate()
```

## What to read next

- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  `Object.Deactivate`.
- [Physics](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/physics.html) — the contact events that start a flash.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — `Wait`
  and the other durations that read their amount the way `Over` does.
- Generated reference:
  [`ObjectLifetimeFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectLifetimeFactory.html),
  [`ObjectHandle`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectHandle.html),
  [`ObjectFlashBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectFlashBuilder.html),
  [`MaterialNumber`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MaterialNumber.html),
  [`Color`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Color.html).
