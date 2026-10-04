# Follow and lead

Keep one object near another, or have it lead another to a place and wait when that object falls
behind:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Drone : Script
{
    public Operation Pursuit { get; private set; }

    protected override void Build()
    {
        Leader = Bind.Object();
        Pursuit = Define.Operation(nameof(Pursuit));
        Status = Define.Text(nameof(Status));

        On.Ready(Motion.Follow(Leader).WithinDistance(2).AtSpeed(4)
            .As(Pursuit));
        When.Motion(Pursuit).EnteredRange(Status.Set("Close"));
        When.Motion(Pursuit).ExitedRange(Status.Set("Catching up"));
    }
}
```

Put the script on the object that follows, and assign the object to follow to `Leader` in the
Inspector, or name it `Leader` in the scene. While the leader is farther than 2 units away the drone
moves toward it at 4 units per second; inside 2 units it holds. `EnteredRange` and `ExitedRange` run
when the leader comes within the range and when it leaves it.

A follow or a lead is a run that lasts across frames, started once. It is an attempt on an
operation, so `When.Operation`, `IsPending`, `Succeeded`, `Canceled` and `Failed` report it the way
they report a load or a save.

## Direct and routed

| Family | Moves the object | Speed |
|---|---|---|
| `Motion.Follow`, `Motion.Lead` | in a straight line, through its CharacterController, its kinematic Rigidbody, or its transform | `AtSpeed(n)` |
| `Navigation.Follow`, `Navigation.Lead` | along routes its navigation agent follows around walls | set on the agent |

The [Navigation](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/navigation.html) page says how to install the
navigation backend; the routed forms need it, as `Navigation.MoveTo` does.

## The range

`WithinDistance(r)` is the range, in world units between the two objects' origins, measured in all
three axes. A wall between them does not change it.

The run enters the range at a distance of `r` or less, and leaves it only when the distance is more
than `r` plus one unit plus a tenth of `r`. Between the two it keeps what it was, so an object that
stands at the edge does not start and stop on alternate frames:

| `WithinDistance` | Enters at | Leaves above |
|---|---|---|
| 0 | 0 | 1 |
| 2 | 2 | 3.2 |
| 6 | 6 | 7.6 |
| 20 | 20 | 23 |

The run reads the distance once per frame, after `On.Update`. `EnteredRange` and `ExitedRange` run
once in the frame whose reading crossed the edge; a crossing and its return between two readings
produce nothing. The first reading after a start produces no event: it decides whether the run
starts inside or outside. A distance of `r` or less is inside, and anything farther, the margin
included, is outside.

The range, the speed, and a lead's destination are read when the run starts. Changing the variables
later changes the next run. The other object's position is read every frame.

## Following

| While the leader is | The follower |
|---|---|
| inside the range | holds |
| outside the range | moves toward it, and stops just inside `r` |

A direct step stops a thousandth of a unit inside the range, because Unity keeps positions in single precision and a
step that stopped at exactly `r` could read back as just outside it.

A follow does not finish by itself. It keeps the attempt pending while it holds, so it moves again
when the leader walks off. It ends when you cancel it, when the leader is gone, or when the follower
is disabled.

## Leading

```csharp
public sealed partial class Escort : Script
{
    public Operation Guide { get; private set; }

    protected override void Build()
    {
        Follower = Bind.Object();
        Exit = Bind.Object();
        Guide = Define.Operation(nameof(Guide));
        Status = Define.Text(nameof(Status));

        On.Ready(Motion.Lead(Follower).To(Exit).WithinDistance(6)
            .AtSpeed(3).As(Guide));
        When.Motion(Guide).ExitedRange(Status.Set("Waiting"));
        When.Motion(Guide).EnteredRange(Status.Set("Leading"));
        When.Operation(Guide).Succeeded(Status.Set("Arrived"));
    }
}
```

| While the follower is | The leader |
|---|---|
| inside the range | moves toward the destination |
| outside the range | waits |

The lead arrives when the leader's origin is within the same range of the destination, here 6
units, and its attempt succeeds once. The follower's distance and the destination's distance use
the one number and measure different objects, so the follower coming within range does not finish
the lead. `To` takes a `Bind.Object()` landmark, a `Vector3`, or three numbers; a landmark's
position is read when the lead starts, so the landmark moving later does not move the destination.

## Starting on a kinematic Rigidbody

A kinematic Rigidbody moves in the physics step, so its run starts there. Write the start in
`On.FixedUpdate`; running it again while the run is pending changes nothing:

```csharp
On.FixedUpdate(Motion.Follow(Leader).WithinDistance(2).AtSpeed(4)
    .As(Pursuit));
```

A CharacterController, or an object with neither component, starts in any event and moves once per
frame. A dynamic Rigidbody refuses the start. The run reads the position the object has: a position
a kinematic body asked for is not in range until the physics step has moved the body there.

## Routed runs

```csharp
On.Ready(Navigation.Follow(Leader).WithinDistance(2).As(Pursuit));
On.Ready(Navigation.Lead(Follower).To(Exit).WithinDistance(6)
    .As(Guide));
When.Navigation(Pursuit).EnteredRange(Status.Set("Close"));
```

- A routed follow outside its range asks for a route to the leader. It asks again, inside the same
  attempt, when the leader has moved more than the range's margin away from where the last route
  went, and inside the range it stops the agent.
- A routed lead asks for one route to its destination and holds the agent while the follower is
  away. `Navigation.Pause()` holds the agent too; the follower coming back never releases a pause.
- A route that does not reach the leader is followed to its reachable end, and the follow stays
  pending there with `Navigation.ReachedPartialEnd(op)` true. When the leader moves somewhere
  reachable, the follow continues. A lead at the end of such a route succeeds with
  `ReachedPartialEnd` true and `Arrived` false.
- `RequireComplete()` before `As` refuses a route that does not reach: the attempt fails as
  `Unreachable`. A route that reaches nothing fails as `Unreachable` with or without it.
- The agent's stopping distance is not an arrival. An agent that stops farther from the destination
  than the range keeps the lead waiting; choose a range that allows for the agent's stopping distance
  and for the height between the object's origin and the destination.

## When a run ends

| What happens | The attempt |
|---|---|
| a lead arrives | succeeds |
| `op.Cancel()` | cancelled |
| the other object is destroyed, deactivated, despawned, or replaced by a `LiveRebind()` binding | cancelled; no `ExitedRange` runs |
| the moving object is disabled | cancelled |
| `Motion.TeleportTo`, `Transform.SetWorldPosition` or `Transform.SetLocalPosition` on the moving object | cancelled, then the position is written |
| the object or the other object is unavailable when the run starts, or a body that cannot start there | fails as `Denied` |
| a routed run's route reaches nothing | fails as `Unreachable` |

A new start captures the binding's object as it is then. Nothing moves a run to a replacement by
itself. A run belongs to the object's current life: when the object is despawned, its runs end
without an event, and a reused pooled object starts with none.

While a pause stops a script, its runs read no distance and a direct run moves nothing. After the
pause, the first reading compares the current distance with the state before the pause.

## One run moves an object

A run owns its object's position. While one moves the object:

- another `Motion.Follow` or `Motion.Lead` start on that object, from any script, fails as `Denied`;
- `Motion.MoveBy`, `Motion.MoveTo`, `Transform.MoveBy`, `Transform.MoveTo(...).Over` and
  `Transform.RotateAround` on the object are refused, reported once in the Console, and ignored;
- a `Navigation` move, follow or lead of the object fails as `Denied`, and a direct start on an
  object a navigation attempt drives fails as `Denied` too.

Rotation is not part of the run: `Motion.FaceTowards` turns a follower while it follows. Cancel a run
with `op.Cancel()` before moving the object another way.

## Call list

These lines are call signatures, not a script you can paste.

```csharp
Motion.Follow(target).WithinDistance(r).AtSpeed(s).As(operation)
Motion.Lead(follower).To(destination).WithinDistance(r).AtSpeed(s)
    .As(operation)                  // To(x, y, z) and To(landmark) too
Navigation.Follow(target).WithinDistance(r)
    [ .RequireComplete() ] .As(operation)
Navigation.Lead(follower).To(destination).WithinDistance(r)
    [ .RequireComplete() ] .As(operation)
When.Motion(operation).EnteredRange(blocks)
When.Motion(operation).ExitedRange(blocks)
When.Navigation(operation).EnteredRange(blocks)
When.Navigation(operation).ExitedRange(blocks)
```

## What to read next

- [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) — the movement mechanisms a direct run uses.
- [Navigation](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/navigation.html) — the backend, routes and the reads.
- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) — operation
  handles and their watches.
- Generated reference:
  [`MotionFollowBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MotionFollowBuilder.html),
  [`MotionLeadBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MotionLeadBuilder.html),
  [`RangeWatchBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.RangeWatchBuilder.html).
