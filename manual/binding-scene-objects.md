# Binding scene objects

Bind an object in the scene and act on it:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Lighthouse : Script
{
    protected override void Build()
    {
        Beacon = Bind.Object();
        On.Ready(Object.For(Beacon).SetColor(1, 0.6, 0.1));
    }
}
```

`Beacon` binds the object the `LunyScript Behaviour`'s Inspector assigns to the `Beacon` field. With
nothing assigned, it binds the first object named `Beacon` in the same scene as the object the script
runs on, whether that object is active or not.

## Where the object comes from

| Order | What the binding takes |
| --- | --- |
| 1 | The object assigned in the Inspector, whatever its name |
| 2 | The first object in the script's own scene that the search finds |
| 3 | Nothing: the binding is unavailable |

A binding never creates an object in place of a missing one. The search finds objects by the
declared name, or by the conditions the line writes instead:

```csharp
Boss = Bind.Object().WithTag("Boss");
Third = Bind.Object().WithTag("Boss").Named("ThirdBoss");
```

`WithTag` and `Named` replace the declared name, and every condition written must hold, so `Third`
binds an object named `ThirdBoss` that carries the `Boss` tag. An object assigned in the Inspector is
used as it is: the conditions apply to the search only. When two objects match, the first one found
is bound, the spawn reports both, and which one is first can differ between runs; give the object a
name no other object in the scene has.

## When the object is missing

A binding that found nothing, or whose object was destroyed or despawned, is unavailable:

```csharp
Witch = Bind.Object();
On.Ready(If(Witch.IsValid).Then(Object.For(Witch).Show()));
```

`IsValid` is false, every block that acts through the binding does nothing, and nothing is logged:
a level that has no witch is an ordinary level. A read through it gives its default, so
`Object.For(Witch).IsVisible` is false. C# on the object reads the bound object with
`(GameObject)behaviour.GetObject(script.Witch)`, which is null while the binding is unavailable.

## Requiring the object, or finding it later

```csharp
Door = Bind.Object().MustExist();
Guard = Bind.Object().WithTag("Enemy").LiveRebind();
```

`MustExist()` refuses to start the script on an object whose binding found nothing, and the error
names the binding. An object that ends later leaves the binding unavailable, and the script keeps
running.

`LiveRebind()` searches again, before the script's next update, while the binding holds nothing: after
the search found nothing at the start, and after the object it found ended. It searches when a script
spawned, when LunyScript created, spawned or destroyed an object, and when a scene finished loading.
An object assigned in the Inspector is never replaced by a search. A binding cannot be both:
`MustExist().LiveRebind()` does not compile.

```csharp
When.Binding(Guard).Changed(Swaps.Add(1));
When.Binding(Guard).Unavailable(Alarm.Set(true));
```

`Changed` runs after an update in which the binding took a different object or lost its object.
`Unavailable` runs only when it lost it. A replacement found in the same update counts once, as a
change.

## Naming a binding yourself

A binding's name is what the Inspector field is labelled and matched by. The property the generator
writes for the line gives the binding its own name. A local or a hand-written property names it with
`As`:

```csharp
var guard = Bind.Object().As("Guard");
```

## What takes a binding

`Object.For`, `Camera.For`, `View.For`, `Audio.For`, `Particles.For`, `Panel.For`, `Panel.Open`,
`Panel.Close`, `Navigation.For`, `Motion.TeleportTo`, `Audio.Listener.SetTarget`, `AttachedTo`, and a
spawn placed at a landmark all take an `ObjectBinding`. An asset such as an `AudioClip` passed to them
does not compile.

## What to read next

- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) — the asset inputs a
  script declares beside its bindings.
- [Compile-time checks](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/compile-time-checks.html) — LUNY008, which asks
  for scripts in an assembly definition with No Engine References.
- Generated reference:
  [`ObjectBinding`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectBinding.html),
  [`ObjectBindingBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectBindingBuilder.html),
  [`BindingWatchBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.BindingWatchBuilder.html).
