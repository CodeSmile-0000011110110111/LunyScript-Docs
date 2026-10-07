# Navigation

Send an object to a place along a route around walls, and find out whether it got there:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Guard : Script
{
    public Operation Patrol { get; private set; }

    protected override void Build()
    {
        Post = Bind.Object();
        Patrol = Define.Operation(nameof(Patrol));
        OnPost = Define.Flag(nameof(OnPost));

        On.Ready(Navigation.MoveTo(Post).As(Patrol));
        When.Operation(Patrol).Succeeded(
            If(Navigation.Arrived(Patrol)).Then(OnPost.Set(true)));
    }
}
```

Put the script on an object that has a `NavMeshAgent`, in a scene with a navigation mesh and an
object named `Post`, or assign another object in the scene to `Post` in the Inspector. When the object becomes ready it asks the
navigation mesh for a route to the post and follows it. The move is an attempt on the operation
`Patrol`, so the operation's watches and conditions report how it ended.

`Motion.MoveTo`, on the [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) page, moves in a straight
line and stops at the first wall. `Navigation.MoveTo` finds the way around it.

## The navigation backend

Navigation needs a backend. The backend for Unity's NavMesh is `NavMeshNavigationProvider` in the
`CodeSmile.LunyScript.Navigation` assembly, which compiles when Unity's AI module is enabled. When
Play starts, LunyScript installs it by itself, unless **NavMesh navigation** is turned off under
Edit, Project Settings, LunyScript, Supplied providers.

A backend of your own for another pathfinding package is a class that implements
`INavigationProvider`, `MyNavigationProvider` below. C# installs it before the first script moves,
and it replaces the supplied one:

```csharp
using CodeSmile.LunyScript;
using UnityEngine;

public sealed class GameSetup : MonoBehaviour
{
    private void Awake()
    {
        var runner = LunyScriptRuntime.DefaultRunner;
        runner.NavigationGateway.UseProvider(
            new MyNavigationProvider());
    }
}
```

Without a backend, every move fails as `Denied` and the Console says once which line to add. The
script still runs.

The navigation mesh is Unity's. Bake it with the AI Navigation package's `NavMeshSurface`, or build
it at run time with `NavMeshBuilder`, which the example scene does. Speed, acceleration, stopping
distance, turning and avoidance are the settings of each object's `NavMeshAgent`.

## Where to go

The destination is a `Vector3`, three numbers, or an object in the scene declared as an input. The
position is read once, when the block runs:

```csharp
On.Ready(Navigation.MoveTo(Post).As(Patrol));
GoHome = Define.Message();
Corner = Define.Message();
On.Message(GoHome, Navigation.MoveTo(Home).As(Patrol));
On.Message(Corner, Navigation.MoveTo(8, 0, -4).As(Patrol));
```

A moving target is not followed by itself. A chase runs the move again, and each run reads the
target's position anew:

```csharp
On.Ready(Run(Navigation.MoveTo(PlayerPosition).As(Chase))
    .Every(0.25).Seconds().Start());
```

Running a move again while its attempt is still going does one of two things:

- **The same request continues.** The same destination, the same object and the same choice of
  `RequireComplete()` keep the attempt that is under way. A chase whose target stands still asks
  for no new route.
- **Any other request replaces it.** The attempt under way ends as `Canceled` and a new one
  starts. `When.Operation(Chase).Canceled` runs once for each replacement, so a chase after a
  moving target sees many; `Succeeded` is the watch that means the move ended.

One object follows one route. A move of an object that another operation is moving ends that
operation's attempt as `Canceled`.

## Partial routes

When no route reaches the destination, the navigation mesh gives a partial route that ends at the
reachable point closest to it. A destination that is not on the navigation mesh at all, such as a
point inside a wall or beyond the mesh's edge, gets a partial route to the nearest point of the mesh.
The move follows it. The attempt ends as `Succeeded`, and
`Navigation.ReachedPartialEnd` separates that end from arriving:

```csharp
When.Operation(Patrol).Succeeded(
    If(Navigation.Arrived(Patrol)).Then(OnPost.Set(true)),
    If(Navigation.ReachedPartialEnd(Patrol)).Then(Stuck.Set(true)));
```

`RequireComplete()` refuses a partial route instead. The object holds its position while the
route is being worked out, never takes a step along a refused route, and the attempt fails as
`Unreachable`:

```csharp
Cross = Define.Message();
On.Message(Cross, Navigation.MoveTo(Island)
    .RequireComplete().As(Crossing));
When.Operation(Crossing).Failed(Stuck.Set(true));
```

With `RequireComplete()`, `Succeeded` means the object arrived.

## Stopping, pausing and resuming

```csharp
Halt = Define.Message();
Stun = Define.Message();
Wake = Define.Message();
On.Message(Halt, Navigation.Stop());
On.Message(Stun, Navigation.Pause());
On.Message(Wake, Navigation.Resume());
```

- `Stop()` clears the route. The attempt that was moving the object ends as `Canceled`, and the
  object stays where it stopped. `Patrol.Cancel()` does the same to the attempt it names.
- `Pause()` holds the object where it is. The route and the attempt stay. A move started while the
  object is paused waits too, so a stunned enemy stays stunned while its chase goes on asking.
- `Resume()` releases the hold and the object continues along its route.

A pause lasts until `Resume()`; a new move and a `Stop()` both leave it in place.

## Another object

`For` moves, stops, pauses or resumes an object the script declares as an input, instead of the
object the script runs on. That object carries its own `NavMeshAgent`:

```csharp
CallHeel = Define.Message();
Sit = Define.Message();
On.Message(CallHeel, Navigation.MoveTo(Home).For(Hound).As(Heel));
On.Message(Sit, Navigation.Stop().For(Hound));
```

`RequireComplete()` and `For` may be written in either order, each once, before `As`.

## Reading the route and the end

Every read describes the latest attempt the operation started:

```csharp
var route = Navigation.Route(Chase);
On.Update(
    If(route.IsPending).Then(Status.Set("thinking")),
    If(route.IsPartial).Then(Status.Set("out of reach")),
    If(Navigation.IsMoving(Chase)).Then(Steps.Add(1)));
```

| Read | True when |
|---|---|
| `Navigation.Route(op).IsPending` | the route is being worked out |
| `Navigation.Route(op).IsComplete` | the route reaches the destination |
| `Navigation.Route(op).IsPartial` | the route ends short of the destination |
| `Navigation.Route(op).IsInvalid` | no route reaches anything |
| `Navigation.IsMoving(op)` | the attempt is going and the object moves this frame |
| `Navigation.Arrived(op)` | the attempt ended at the destination |
| `Navigation.ReachedPartialEnd(op)` | the attempt ended at a partial route's end |

Before the first attempt every read is false. After an attempt ends, the route stays readable and
`IsMoving` is false. The operation's own `IsPending`, `Succeeded`, `Failed`, `Canceled` and
`Failure` read the same attempt; the [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html)
page explains them.

## When a move fails

A move fails as `Denied` when:

- no backend is installed;
- the object has no agent, its agent is disabled, or it is not on the navigation mesh;
- the object or the destination landmark is gone or inactive;
- the destination is not a number.

A move fails as `Unreachable` when the route is invalid, or when it is partial and the move requires a
complete one.

The first time each reason happens for a script and an object, the Console says which. A move has
no time limit: a walk takes as long as its route. Where you need one, count it yourself:

```csharp
On.Update(If(Chase.IsPending).Then(Waited.Add(Time.Delta),
    If(Waited > 20).Then(Chase.Cancel(), Waited.Set(0))));
```

## Call list

These lines are call signatures, not a script you can paste. Brackets mark an argument you may leave
out.

```csharp
Navigation.MoveTo(destination) [ .RequireComplete() ] [ .For(actor) ]
    .As(operation)
Navigation.MoveTo(x, y, z) ...            // the same clauses
Navigation.Stop() [ .For(actor) ]
Navigation.Pause() [ .For(actor) ]
Navigation.Resume() [ .For(actor) ]
Navigation.Route(operation).IsPending     // and IsComplete, IsPartial,
                                          // IsInvalid
Navigation.IsMoving(operation)
Navigation.Arrived(operation)
Navigation.ReachedPartialEnd(operation)
```

## What to read next

- [Follow and lead](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/follow-and-lead.html) — `Navigation.Follow` and
  `Navigation.Lead`: one attempt that keeps routing toward a moving object, or leads one to a place.
- [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) — straight-line moves, forces and teleports.
- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) — operation
  handles and their watches.
- Generated reference:
  [`NavigationFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.NavigationFactory.html),
  [`NavigationRoute`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.NavigationRoute.html),
  [`NavMeshNavigationProvider`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Navigation.NavMeshNavigationProvider.html).
