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
        Flash = Define.Number(nameof(Flash), 0);

        On.CollisionEnter(Health.Subtract(1), Flash.Set(0.15),
            Object.SetColor(1, 0.25, 0.25));
        On.Update(If(Flash > 0).Then(Flash.Subtract(Time.Delta),
            If(Flash <= 0).Then(Object.ResetColor())));
        On.Update(If(Health <= 0).Then(Object.Hide()));
    }
}
```

Put the script on an object that has a `MeshRenderer` and a collider. Each hit tints the object red
and starts a 0.15-second countdown in `Flash`; the frame the countdown reaches zero, `ResetColor`
removes the tint. At zero health the object is no longer drawn, and its collider and its script keep
running.

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
Hit = Define.Routine();
Traitor = Define.Message();

On.Ready(Object.SetColor(Team.Tint));
On.CollisionEnter(Routine(Hit).Run(Object.SetColor(Team.Flash),
    Wait(0.15), Object.SetColor(Team.Tint)));
On.Message(Traitor, Team.Tint.Set(Color.Green));
```

`Team.Tint.Set(...)` changes this object's copy; the asset keeps its colour.
[Custom data, JSON and text files](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/custom-data-and-files.html) shows the
schema and the asset.

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
`Single`, 3.4028235E+38, and a material number that is not finite, are refused the same way.

## Call list

These lines are call signatures, not a script you can paste. Brackets mark an argument you may leave
out.

```csharp
Object.Hide()
Object.Show()
Object.IsVisible
Object.SetColor(red, green, blue [ , alpha ])
Object.SetColor(colour)                      // a Color or a colour variable
Object.ResetColor()
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
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — conditions
  like the one that ends a flash.
- Generated reference:
  [`ObjectLifetimeFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectLifetimeFactory.html),
  [`ObjectHandle`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectHandle.html),
  [`MaterialNumber`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MaterialNumber.html),
  [`Color`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Color.html).
