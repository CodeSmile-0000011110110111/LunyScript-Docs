# Events and object lifetime

Register blocks against an object's lifetime and they run when that object starts, ticks, or ends:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Door : Script
{
    protected override void Build()
    {
        On.Ready(Object.Create("Hinge Marker"));
        On.Disabled(Object.Deactivate("Hinge Marker"));
        On.Enabled(Object.Activate("Hinge Marker"));
        On.Despawned(Object.Destroy("Hinge Marker"));
    }
}
```

Add the component and pick `Door`. When the object starts, it creates an empty marker named
`Hinge Marker`. Disabling the door deactivates that marker; enabling the door activates it again.
Ending the door destroys the marker.

## What `On` does

`On.*` is the registration surface. Each call takes one or more blocks and returns nothing, so an
`On.*` call is a statement in `Build()` rather than a value you can pass on. Two calls that name
the same event both fire, in the order they were written.

This page is the object's lifetime: created, spawned, ready, enabled, disabled, despawned, the
three ticks, application pause and focus, and creating or removing objects. Contact events live
on [Physics](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/physics.html). `On.Message` lives on
[Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html). Authority gain and loss live on
[Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html).

## Lifecycle events

| Event | When it runs |
| --- | --- |
| `On.Created(block, ..)` | Once, at the first bind to a host object, after declared inputs are resolved and before `Ready`. |
| `On.Spawned(block, ..)` | At the start of every incarnation: right after `Created` on the first, and alone each time a pool hands the object out again. |
| `On.Ready(block, ..)` | Once per spawn, before this object's first update of any kind. |
| `On.Enabled(block, ..)` | Once per disabled-to-enabled transition. Unity's first `OnEnable` raises it, so on a scene object it runs before `Ready`. |
| `On.Disabled(block, ..)` | Once per enabled-to-disabled transition. |
| `On.Despawned(block, ..)` | Once, while the object and its host are both still valid. |

```csharp
On.Created(Serial.Set(NextSerial));
On.Spawned(Body.MakeDynamic());
On.Ready(Health.Set(100), Powered.Set(true));
On.Enabled(Enables.Inc());
On.Disabled(Disables.Inc());
On.Despawned(Despawns.Inc());
```

An object a pool hands out again raises `Spawned` and `Ready` again and leaves `Created` alone;
[Object pools](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/object-pools.html) shows that cycle.

## Tick events

| Event | When it runs |
| --- | --- |
| `On.Update(block, ..)` | Once per frame while enabled, subject to the script's process mode. |
| `On.FixedUpdate(block, ..)` | Zero or more times per frame, before `On.Update`. |
| `On.LateUpdate(block, ..)` | After every object's `On.Update` and after variable watches. |

```csharp
On.Update(Age.Add(Time.Delta), Transform.RotateBy(0, 0, 35 * Time.Delta));
On.FixedUpdate(Motion.AddForce(0, 0, 12).InLocalSpace());
On.LateUpdate(Readout.Set(Text.Format("age {0:1} s", Age)));
```

Physics work that repeats belongs in `On.FixedUpdate`. A force, an impulse, an explosion, a velocity write or
`StopMotion` given once, when an object starts, stops or changes state, may also go in a lifecycle event; see
[Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) for which calls each event takes. Variable watches are
polled between `On.Update` and `On.LateUpdate`, so a watch never fires from inside
`On.FixedUpdate`.

## Application events

```csharp
On.Application.Paused(Autosave.Set(true));
On.Application.Resumed(Autosave.Set(false));
On.Application.FocusGained(Focused.Set(true));
On.Application.FocusLost(Focused.Set(false));
On.Application.Quitting(Time.Resume());
```

`On.Application.*` events are delivered to every enabled object. The editor raises focus changes that
a built player may leave out, and an operating system that terminates an application may skip
`Quitting`.

## Creating and removing objects

`Object` produces and ends game objects that this script owns. `Create` makes a fresh object and
`Destroy` ends one for good. `Spawn` and `Despawn` reuse copies from a pool, on
[Object pools](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/object-pools.html).

```csharp
[Asset] public Prefab Sentry { get; private set; }

protected override void Build()
{
    On.Ready(Object.Create("Marker"));
    On.Message("PostGuard",
        Object.Create(Sentry).At(new Vector3(0, 0.8, 0)).ChildOf()
            .Into("Guard"));
    On.Message("RecallGuard", Object.Destroy("Guard"));
    On.Update(If(Health <= 0).Then(Object.Destroy()));
}
```

`PostGuard` creates a copy of `Sentry`, parents it to this object, and names it `Guard` in this
script. `RecallGuard` destroys that copy by the same name.

`Object.Create(name)` makes an empty object immediately. It carries no script, and it is destroyed
when this object's script ends.

`Object.Create(prefab)` makes a fresh copy of a declared `Prefab` input or of a succeeded
`Operation<Prefab>` handle; see
[Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) for both. Leave
`At` out and the prefab keeps its own pose; leave `ChildOf` out and the object goes to the scene
root. The copy is made after the current event's blocks finish, so later events can name it.

**Everything this script makes is destroyed when this script's object ends**, with or without
`Into`. Write `SurvivesCaller()` on a copy that should stay, such as a pickup a dying enemy drops:

```csharp
On.Update(If(Health <= 0)
    .Then(Object.Create(Pickup).SurvivesCaller(), Object.Destroy()));
```

Write it before the object ends, as here: a create written in `On.Despawned` belongs to an object that
is already ending, and is dropped.

`NearPlayer(player, radius)` places a joining player's object near the object another player
controls, on the same floor, facing the same way:

```csharp
When.Player(2).Paired(Object.Create(Avatar).NearPlayer(1, 2)
    .ForPlayer(2).Into("Guest2"));
```

Up to 16 points within `radius` metres are tried; the first with the target player's floor under it,
within 0.25 metres of that player's floor height, is used, so a player joining beside a wall appears
on the floor and not in or behind the wall. With none, the object appears where the target player
stands; players pass through each other. With a `Camera.FollowGroup().Bounds` in force the point
also stays where the group fits its Bounds. The target is the object `ForPlayer(player)` produced or
whose Local Player field names the player. No such object, no floor under it, or a radius that is not
above zero is reported as an error and nothing is created. `NearPlayer` is the placement, so `At`
and a frame do not follow it.

With a name, `Activate`, `Deactivate` and `Destroy` act on that object after the current event's
blocks finish, and `Destroy` drops the name where the block runs, so a later block no longer finds
it. With no name they act on this object after the current dispatch finishes, so the rest of the
block list still runs. `Object.Destroy()` on this object produces `On.Disabled`, then
`On.Despawned`, and then destroys the host.

`Object` also changes how an object is drawn while it keeps running: `Hide`, `Show`, `SetColor` and
material numbers are on [Showing, hiding and tinting objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/showing-hiding-and-tinting.html).

## Methods

Each row is one call. Optional chain methods are in italics. Brackets mark an argument you may
leave out.

| Call | What it does |
| --- | --- |
| `Object.Create(name)` | Makes an empty object named `name` in the scene and in this script. |
| `Object.Create(prefab)` | Makes a fresh copy of a declared `Prefab` input. |
| `Object.Create(handle)` | Makes a fresh copy of a succeeded `Operation<Prefab>` payload. |
| *`.At(position)`* | Places the copy at `position`. |
| *`.At(position, rotation)`* | Places the copy at `position` with `rotation`. |
| `position` | Where the copy goes. One `Vector3` or `x, y, z`. |
| `rotation` | How the copy is turned. Leave it out and the prefab keeps its rotation. |
| *`.InWorldSpace()`* | Reads `At` on the scene's axes. |
| *`.InLocalSpace()`* | Reads `At` on the parent's axes. This is the default after `At`. |
| *`.NearPlayer(player, radius)`* | Places the copy near that player's object. `At` does not follow it. |
| *`.ForPlayer(player)`* | Binds scripts on the copy to local player `player`. |
| *`.ChildOf()`* | Parents the copy to this object. |
| *`.ChildOf(name)`* | Parents the copy to the object this script already named. ChildOf cannot parent to itself. |
| *`.Into(name)`* | Names the copy in this script so later calls can address it. |
| `name` | The name later `Activate`, `Deactivate` and `Destroy` use. |
| *`.SurvivesCaller()`* | Leaves the copy in the scene when this script's object ends. |
| `Object.Activate([name])` | Activates this object, or the named copy. |
| `Object.Deactivate([name])` | Deactivates this object, or the named copy. |
| `Object.Destroy([name])` | Destroys this object, or the named copy. |

## What to read next

- [Physics](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/physics.html) — contact events and `Other`.
- [Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) — `On.Message` and sending from C#.
- [Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html) —
  `On.Authority.Gained` and `On.Authority.Lost`.
- [Object pools](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/object-pools.html) — reuse spawned objects with
  `Define.Pool`, `Object.Spawn` and `Object.Despawn`.
- [Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html) — which tick events
  a paused game still delivers.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — work that
  spans more than one event.
- Generated reference:
  [`OnFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OnFactory.html),
  [`OnApplicationFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OnApplicationFactory.html),
  [`ObjectLifetimeFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectLifetimeFactory.html).
