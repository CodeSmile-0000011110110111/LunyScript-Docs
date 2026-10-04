# Object pools

Launch enemies from a portal and reuse the ones that are done instead of making new ones:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Spawner : Script
{
    public Pool Enemies { get; private set; }

    protected override void Build()
    {
        Enemy = Bind.Prefab();
        Portal = Bind.Object();
        Enemies = Define.Pool(nameof(Enemies)).From(Enemy)
            .HardCap(8).Prewarm(4).SpawnAt(Portal).InRadius(3.0);
        Wave = Define.Flag(nameof(Wave), false);

        On.Update(If(Wave.IsTrue())
            .Then(Object.Spawn(Enemies), Wave.Set(false)));
    }
}

public sealed partial class EnemyAi : Script
{
    protected override void Build()
    {
        Health = Define.Number(nameof(Health), 100);
        On.Spawned(Body.MakeDynamic());
        On.Update(If(Health <= 0).Then(Object.Despawn()));
    }
}
```

Assign the enemy prefab and a portal object in the scene on the spawner's LunyScript Behaviour. Each
time `Wave` is set, one enemy leaves the pool at a random point within three units of the portal. When
an enemy's health reaches zero it goes back to the pool, and a later spawn reuses it.

## Declaring a pool

`Define.Pool(nameof(X)).From(prefab)` declares a pool of copies of one prefab input and turns into
the `Pool` handle you keep in a property. `Build()` makes no object: the pool fills when the
game runs.

| Clause | What it does |
| --- | --- |
| `.HardCap(n)` | The most copies the pool holds, idle and in use together. Without it the pool has no limit. |
| `.Prewarm(n)` | How many inactive copies the pool prepares before the first spawn. At most the hard cap. |
| `.SpawnAt(position)` | Where a spawn goes when the spawn itself names no place. Also `SpawnAt(x, y, z)`, a rotation, or an object in the scene. |
| `.InRadius(r)` | Spreads `SpawnAt` over a disk of radius `r`. |
| `.InRadius(r, DiskPlane.XY)` | The same disk on the X and Y axes, for a 2D scene. `DiskPlane.YZ` is the third plane. |
| `.InSphere(r)` | Spreads `SpawnAt` through a ball of radius `r`. |
| `.InWorldSpace()` | Reads `SpawnAt` and its shape in world coordinates and axes. |

The copies live in the scene of the object that runs the script, under an inactive object named after
the pool. When that scene unloads, the pool and every copy go with it.

## Spawning and despawning

```csharp
On.Ready(Object.Spawn(Enemies));
On.Ready(Object.Spawn(Enemies).Into("Boss"));
On.Message("Retreat", Object.Despawn("Boss"));
On.Update(If(Health <= 0).Then(Object.Despawn()));
```

`Object.Spawn(pool)` takes one copy out of the pool. The pool reuses an idle copy when it has one and
makes a new one below its hard cap. `Into(name)` gives the copy a name in this script. `Despawn` puts a
copy back: with a name from the script that spawned it, or with no name from the copy's own script.

A spawn is applied after the current event's blocks finish, so a copy held with `Into` is in its slot
from the next event on. A copy that goes back becomes available to spawns made after that; a spawn
written right after the despawn, in the same event, uses another copy.

`Object.Destroy()` or `Object.Destroy(name)` ends a pooled copy for good and takes it out of its pool,
which can then make a new one in its place. `Despawn` works only on pooled copies; a fresh
`Object.Create` copy ends with `Destroy`.

## Where a spawn goes

A spawn goes, in order of preference, where its own `At` says, where the pool's `SpawnAt` says, or at
the position and rotation of the object whose script spawns it.

```csharp
On.Ready(Object.Spawn(Enemies).At(Ambush));
On.Ready(Object.Spawn(Enemies).At(Ambush).InRadius(2.0));
On.Ready(Object.Spawn(Enemies).At(new Vector3(0, 1, 0), Rotation.Identity));
On.Ready(Object.Spawn(Enemies).At(Column, 0, Row));
```

A position is one `Vector3` or its three numbers: `At(Column, 0, Row)` places the copy where
`At(Vector3.From(Column, 0, Row))` would, and so does `At(x, y, z, rotation)` with a rotation.

- **An `At` replaces the pool's placement.** `At(Ambush)` puts the copy exactly on `Ambush`; to spread
  it, write a shape after the `At`.
- **At an object in the scene** the copy takes that object's position and rotation. The object's scale
  does not change the radius.
- **A disk lies on the X and Z axes** of the place it spreads around: the object's own axes, or the
  rotation the `At` names. `InWorldSpace()` uses the world's axes instead.
- **Every point of a disk or a ball is equally likely**, and an exact spawn draws no random number.

## What a reused copy keeps

A copy's script starts fresh on every spawn, and nothing else is reset for you.

| Event | When it runs on a pooled copy |
| --- | --- |
| `On.Created` | Once, on the copy's first spawn. |
| `On.Spawned` | On every spawn, before `Enabled` and `Ready`. |
| `On.Enabled`, `On.Ready` | On every spawn. |
| `On.Disabled`, `On.Despawned` | On every despawn, while the copy is still where it was. |

Every variable of the copy's script is back at its declared value on each spawn. Native state is not:
a Rigidbody keeps its velocity and whether it is kinematic, an Animator its state, a particle system its particles, and the object
its scale and anything else its last use changed. Reset what matters in `On.Spawned`:

```csharp
On.Spawned(Body.MakeDynamic(), Transform.SetScale(1),
    Particles.Play());
```

A pool runs a reused copy's `On.Spawned` before it activates the copy, and Unity drops a force on an inactive object, so
a push the copy should start with goes in `On.Enabled`, which runs after the activation:
`On.Enabled(Motion.AddImpulse(0, 3, 0).InWorldSpace())`. [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) has the
rule.

## Who ends the copies

A copy belongs to the script that spawned it, with or without a name. When that script's object ends,
its copies go back to their pool. `SurvivesCaller()` leaves a copy out in the scene after its spawner
ends:

```csharp
On.Update(If(Health <= 0)
    .Then(Object.Spawn(Coins).SurvivesCaller(), Object.Destroy()));
```

Spawn before the spawner ends, as here: a spawn written in `On.Despawned` belongs to an object that is
already ending, and is dropped.

A copy that survives its spawner cannot be the spawner's child, because Unity destroys a child with its
parent, so `ChildOf()` together with `SurvivesCaller()` is refused when the script is built.

## When the pool is full

At the hard cap a spawn is refused: no copy is taken back from a use, and nothing is made. Bind the
spawn to an operation to react to it:

```csharp
TakeEnemy = Define.Operation(nameof(TakeEnemy));
On.Update(If(Wave.IsTrue())
    .Then(Object.Spawn(Enemies).As(TakeEnemy), Wave.Set(false)));
When.Operation(TakeEnemy).Failed(Full.Set(true));
```

The failure is `OperationFailure.CapacityExhausted`, and
`If(TakeEnemy.FailedAs(OperationFailure.CapacityExhausted))` tests for it. A spawn at an object in the
scene that is inactive or gone fails as `NotFound`. A refused spawn with no `As` writes one error to the
Console per pool and reason.

## Moving from `Object.Spawn(prefab)`

`Object.Spawn` takes a pool. Code that passed it a prefab does not compile, and the compiler's message
names the two replacements:

| You wrote | Write |
| --- | --- |
| `Object.Spawn(prefab)` for a one-off object | `Object.Create(prefab)`, with the same `At`, `ChildOf` and `Into` |
| `Object.Spawn(prefab)` for objects that come and go | a `Define.Pool` and `Object.Spawn(pool)` |
| `Object.Despawn()` on an object that is not pooled | `Object.Destroy()` |

A copy made with `Object.Create(prefab)` is destroyed with the script that made it; add
`SurvivesCaller()` to keep it.

## Methods

Each row is one call. Optional chain methods are in italics. Brackets mark an argument you may
leave out.

| Call | What it does |
| --- | --- |
| `Define.Pool(name).From(prefab)` | Declares a pool of copies of that prefab. |
| *`.HardCap(n)`* | The most copies the pool holds, idle and in use together. |
| *`.Prewarm(n)`* | How many inactive copies to prepare before the first spawn. |
| *`.SpawnAt(position)`* | Where a spawn goes when the spawn itself names no place. |
| *`.InRadius(r)`* | Spreads `SpawnAt` over a disk of radius `r`. |
| *`.InSphere(r)`* | Spreads `SpawnAt` through a ball of radius `r`. |
| `Object.Spawn(pool)` | Takes one copy out of the pool. |
| *`.At(position)`* | Places this spawn at `position`. Replaces the pool's `SpawnAt`. |
| *`.At(position, rotation)`* | Places this spawn at `position` with `rotation`. |
| `position` | Where the copy goes. One `Vector3`, `x, y, z`, or a scene object. |
| `rotation` | How the copy is turned. |
| *`.InWorldSpace()`* | Reads `At` or `SpawnAt` on the scene's axes. |
| *`.InLocalSpace()`* | Reads `At` or `SpawnAt` on the parent's axes. |
| *`.ChildOf()`* | Parents the copy to this object. |
| *`.ChildOf(name)`* | Parents the copy to the object this script already named. ChildOf cannot parent to itself. |
| *`.Into(name)`* | Names the copy in this script so later calls can address it. |
| `name` | The name later `Despawn` and `Destroy` use. |
| *`.ForPlayer(n)`* | Binds scripts on the copy to local player `n`. |
| *`.SurvivesCaller()`* | Leaves the copy in the scene when this script's object ends. |
| *`.As(operation)`* | Binds the spawn to an attempt. |
| `Object.Despawn([name])` | Returns this copy, or the named copy, to its pool. |
| `Object.Destroy([name])` | Ends this copy, or the named copy, for good. |

## What to read next

- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  `Object.Create` and the lifecycle events a copy receives.
- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) — declaring the
  prefab and scene inputs a pool reads, and operation handles.
- Generated reference:
  [`DefineFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.DefineFactory.html),
  [`ObjectLifetimeFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ObjectLifetimeFactory.html),
  [`SpawnBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.SpawnBuilder.html),
  [`PoolBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.PoolBuilder.html).
