# Collision queries

Ask the physics world what is in front of an object or around it:

```csharp
using CodeSmile.LunyScript;

public sealed partial class GroundProbe : Script
{
    public HitResult Ground { get; private set; }

    protected override void Build()
    {
        Ground = Define.Hit(nameof(Ground));
        Grounded = Define.Flag(nameof(Grounded), false);

        On.FixedUpdate(
            Collision.RayCast().InLocalSpace()
                .Towards(-Vector3.Up).Length(1.1).Into(Ground),
            Grounded.Set(Ground.HasHit));
    }
}
```

Every fixed step the object casts a ray 1.1 units down from its own position, and `Ground` holds
the nearest collider the ray touched. `Grounded` copies whether there was one.

## The seven verbs

A cast moves a shape along a direction and reports what it touches. An overlap tests a shape where
it stands and reports every collider inside it.

| Verb | Measured by | Starts at | Writes |
|---|---|---|---|
| `Collision.RayCast()` | nothing | `From` | `Define.Hit` or `Define.Hits` |
| `Collision.SphereCast()` | `Radius` | `From` | `Define.Hit` or `Define.Hits` |
| `Collision.BoxCast()` | `Size` | `From` | `Define.Hit` or `Define.Hits` |
| `Collision.CapsuleCast()` | `Height`, `Radius` | `From` | `Define.Hit` or `Define.Hits` |
| `Collision.SphereOverlap()` | `Radius` | `At` | `Define.Overlaps` |
| `Collision.BoxOverlap()` | `Size` | `At` | `Define.Overlaps` |
| `Collision.CapsuleOverlap()` | `Height`, `Radius` | `At` | `Define.Overlaps` |

`Size` is the box's full width, height and depth. A capsule's `Height` includes both rounded ends;
a `Height` at or below twice the radius gives the sphere of that radius. A cast travels along
`Towards` for `Length`, or for 1000 units without it. `Oriented(rotation)` turns a box or a
capsule, whose axis is otherwise the frame's up axis. The clauses follow in any order, each once,
and `Into` finishes the query.

A query runs every time its block runs, in whatever event holds it, and replaces its result. The
result belongs to the object that ran it: two enemies running one script keep two results.

## World space and local space

Without a space clause a query is in world space: it names where it starts and, for a cast, where
it goes.

```csharp
Collision.RayCast()
    .From(Transform.WorldPosition)
    .Towards(Transform.Forward)
    .Length(20).Into(Sight);
```

`InLocalSpace()` expresses the query in an object's axes. Without `From` or `At` it starts at the
object, and without `Towards` a cast travels along the object's forward:

```csharp
Collision.BoxCast().Size(1, 2, 1).InLocalSpace()
    .Offset(0, 1, 0).Length(3).Into(Sight);
```

`Offset` moves the start along those axes, in world units that scale does not stretch. An object
named in `From` or `At` supplies both the position and the axes:

```csharp
Muzzle = Bind.Object();
Collision.SphereCast().Radius(0.2).From(Muzzle)
    .InLocalSpace().Length(30).Into(Sight);
```

That cast travels along the muzzle's forward, whichever way the object running the script faces.
`From` and `At` also take `Transform.Child(0)`, `Transform.Parent` and `Transform.Root`.
`Towards(Target)` aims at a bound object from wherever the query starts.

## Along a ray from the screen

`Along(ray)` takes where a cast starts and where it travels from the world ray through a screen
position, such as the pointer's:

```csharp
var point = Input.Vector2("Point");
Collision.SphereCast().Radius(0.2)
    .Along(Camera.ScreenRay(point.Value)).Length(200).Into(Hover);
```

It is `From(ray.Origin).Towards(ray.Direction)` with one camera read, so it is written without
`From`, `Offset` and `Towards`, and the query stays in world space. A ray whose position is outside
the camera's view, or that has no camera, runs no query and clears the result.
[Rays from the screen](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/cameras-and-viewports.html#rays-from-the-screen)
says which camera a ray goes through.

## Reading a result

```csharp
Sight = Define.Hit(nameof(Sight));
Pierced = Define.Hits(nameof(Pierced)).Capacity(16);
Nearby = Define.Overlaps(nameof(Nearby));
```

- A **`Define.Hit`** holds the nearest collider a cast touched: `HasHit`, `Point`, `Normal` and
  `Distance`. It leaves out any collider the shape started inside.
- A **`Define.Hits`** holds every collider a cast touched, nearest first, up to its capacity. A
  collider the shape started inside is an entry at distance 0 whose `Point` is where the cast
  started. Each entry has `Point`, `Normal`, `Distance` and `WorldPosition`.
- A **`Define.Overlaps`** holds every collider an overlap found, up to its capacity. Each entry has
  `WorldPosition` only: an overlapping collider has no contact point.

Read the entries of either kind the way a list is read:

```csharp
On.Update(
    Close.Set(0),
    ForEach(Nearby).Do(entry =>
        If(entry.WorldPosition.DistanceTo(Transform.WorldPosition) < 2)
            .Then(Close.Add(1))),
    If(Pierced.Count > 0).Then(First.Set(Pierced.At(0).Point)));
```

`Count` says how many entries the last query stored. When more colliders qualified than the
capacity holds, `Overflowed` is true: a cast keeps the nearest ones, an overlap keeps them in
Unity's order. The capacity is 8 unless `Capacity(n)` says otherwise, from 2 to 32.

A miss empties the result, and so does an origin whose bound object is missing. Before the first
query, and after a pooled object is reused, the result is empty.

## Filters

```csharp
var water = Define.LayerMask("Water");
Collision.SphereOverlap().Radius(5).InLocalSpace()
    .Layers(water).IgnoreTriggers().ExcludeSelf().Into(Nearby);
```

- **`Layers(mask)`** searches only the layers of a mask `Define.LayerMask` made, from layer names or
  indices from 0 to 31. Without it a query searches every layer except Ignore Raycast.
- **`IncludeTriggers()`** and **`IgnoreTriggers()`** override the project's Queries Hit Triggers
  physics setting.
- **`ExcludeSelf()`** leaves out the object's own colliders: every collider of its nearest enclosing
  Rigidbody, or the object's own colliders when it has none.

## What a query sees

A query sees each collider where the physics world last placed it. An object spawned earlier in the
same list is not there yet, and a Transform write since the last physics step is seen after the
next one. Put a query that must see a fresh spawn in a later event.

## Drawing what a query tested

`Draw()` shows each execution in the Scene view:
the volume where a cast starts, lines along its full length, and each hit at the place the shape
touched, with a marker at the contact point. An overlap draws the volume it tested.

```csharp
Collision.CapsuleCast().Height(2).Radius(0.5).InLocalSpace()
    .Length(4).Draw().Into(Sight);
```

A drawing stays for two seconds of game time after the execution that made it, and the next
execution replaces it. A paused game keeps it on screen. The first drawing adds an object named
LunyScript Collision Drawings under DontDestroyOnLoad in the Hierarchy, which draws them all and
is removed when Play stops. A player build compiles none of the drawing code, so a script that
draws runs there unchanged.

## Project settings

Edit, Project Settings, LunyScript holds three Collision values: the length a cast without
`Length` travels, the capacity a result without `Capacity` holds, and how many seconds a drawing
stays. A running game reads them when Play starts.

## Call list

```text
Collision.RayCast() | SphereCast() | BoxCast() | CapsuleCast()
Collision.SphereOverlap() | BoxOverlap() | CapsuleOverlap()
    .Radius(r) .Height(h) .Size(x, y, z) .Oriented(rotation)
    .From(position | object | relation)       // casts
    .At(position | object | relation)         // overlaps
    .Offset(x, y, z) .Towards(direction | object) .Length(n)
    .Along(Camera.ScreenRay(position))        // casts, world space
    .InLocalSpace() | .InWorldSpace()
    .Layers(mask) .IncludeTriggers() | .IgnoreTriggers()
    .ExcludeSelf() .Draw()
    .Into(hit) | .Into(hits) | .Into(overlaps)
Define.Hit(name)   Define.Hits(name).Capacity(n)
Define.Overlaps(name).Capacity(n)
Define.LayerMask("Water", ...)   Define.LayerMask(8, ...)
hit.HasHit  hit.Point  hit.Normal  hit.Distance
hits.Count  hits.Overflowed  hits.At(i)  ForEach(hits)
entry.Point  entry.Normal  entry.Distance  entry.WorldPosition
Transform.WorldPosition  WorldRotation  Forward  Right  Up
Camera.ScreenRay(position | x, y) .InView(view)  ray.Origin  ray.Direction
Vector3.Forward  Vector3.Right  Vector3.Up
```

## What to read next

- [Physics](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/physics.html) — collision and trigger contact, and
  `Other`.
- [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) — moving the object a query probes from.
- [Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html) — the bound
  objects `From`, `At` and `Towards` take.
- [Lists and maps](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/lists-and-maps.html) — `ForEach` and `At`.
- Generated reference:
  [`CollisionFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CollisionFactory.html),
  [`HitResult`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.HitResult.html),
  [`HitsResult`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.HitsResult.html),
  [`OverlapsResult`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OverlapsResult.html).
