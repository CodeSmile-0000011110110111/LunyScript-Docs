# Physics

Register contact events on the object the script is on, and read the other collider through
`Other`:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Hazard : Script
{
    [Variable(100)] public Number Health { get; private set; }

    protected override void Build() =>
        On.TriggerEnter(If(Other.HasTag("Spike")).Then(Health.Subtract(10)));
}
```

Add the component, give the spike a `Spike` tag and a trigger collider, and put a `Rigidbody` on
the spike or on this object. The object loses ten health each time it enters that trigger. The
`Rigidbody` is Unity's rule for a trigger contact; the script does not create it.

## Contact events

Six events cover collision and trigger contact. They are `On.*` because the contact happens to the
object the script is on. A script that registers none of the six is never subscribed to Unity's
physics callbacks, so a script that only moves costs nothing on the physics side.

```csharp
On.CollisionEnter(Impacts.Inc());
On.CollisionStay(If(Other.HasTag("Player")).Then(Pushing.Set(true)));
On.CollisionExit(Pushing.Set(false));
On.TriggerEnter(If(Other.IsTrigger).Then(InVolume.Set(true)));
On.TriggerStay(Dose.Add(Time.Delta));
On.TriggerExit(InVolume.Set(false));
```

`On.CollisionStay` and `On.TriggerStay` run on every fixed step while contact lasts.

`On.TriggerStay` fires only when **Generate On Trigger Stay Events** is enabled in
Project Settings / Physics / Settings / GameObject. Unity leaves that setting off by default, so
the event does not fire until it is turned on.

A paused `Pausable` script still runs its contact events, so
`On.CollisionEnter(Time.Resume())` resumes the game when something hits it. A script whose
component is disabled runs none of them.
[Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html#collisions-while-the-game-is-paused)
says when a paused game meets a contact at all, and which project setting pauses contact events
too.

Casts and overlaps — `Collision.RayCast` and the six other queries — are on
[Collision queries](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/collision-queries.html).

## The collider you touched

Inside any of the six contact events, `Other` reads the collider on the far side.

| Read | What it gives |
| --- | --- |
| `Other.WorldPosition` | The other collider's position, as a `Vector3`. |
| `Other.WorldPositionX` / `Y` / `Z` | One component of that position, as a number. |
| `Other.Layer` | The other collider's layer, as a number. |
| `Other.IsTrigger` | Whether the other collider is a trigger. |
| `Other.HasTag(tag)` | Whether the other collider carries that tag. |

```csharp
On.TriggerStay(
    HitPoint.Set(Other.WorldPosition),
    HitX.Set(Other.WorldPositionX),
    HitLayer.Set(Other.Layer),
    If(Other.IsTrigger).Then(Volumes.Inc()),
    If(Other.HasTag("Player")).Then(PlayerInside.Set(true)));
```

`Other` is readable while a contact event is running. Reading it from `On.Update` or another tick
event throws `LunyScriptUsageException` when the block runs. `Other.HasTag` compiles to Unity's
`CompareTag` and allocates nothing; a blank tag is refused while `Build()` runs.

## What to read next

- [Collision queries](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/collision-queries.html) — rays, shapes and
  overlaps.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  lifecycle and tick events.
- [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) — moving through a CharacterController or a
  Rigidbody.
- Generated reference:
  [`OnFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OnFactory.html),
  [`OtherFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OtherFactory.html).
