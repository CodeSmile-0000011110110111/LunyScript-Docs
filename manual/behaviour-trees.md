# Behaviour trees

Open a door when the player uses it, but only with the key:

```csharp
using CodeSmile.LunyScript;

public sealed partial class LockedDoor : Script
{
    protected override void Build()
    {
        HasKey = Define.Flag(nameof(HasKey), false);
        Opening = Define.Flag(nameof(Opening), false);
        Locked = Define.Flag(nameof(Locked), false);

        var open = Behavior("Open").Root(
            InOrder(
                Check(HasKey),
                Task(Opening.Set(true)),
                Task(Wait(1)),
                Task(Transform.Child(0).SetLocalPosition(0, 2, 0)))
            .UntilOneFails());

        Use = Define.Message();
        On.Message(Use, open.Start());
        On.Update(If(open.Failed).Then(Locked.Set(true)));
    }
}
```

`Behavior("Open").Root(...)` declares a tree; `open.Start()` runs it. Without the key the `Check`
fails, the composite stops at that failure, and `open.Failed` stays true until the tree is started
again. With the key the tree sets `Opening`, waits one second, lifts the door and ends Succeeded.

## What a behaviour tree is for

A behaviour tree chooses what an object does next by trying options in order and falling back when
one fails: a guard that patrols until it sees an intruder and then gives chase, a door that opens only
with a key, a worker that picks the first job it can do. Use a tree where the choice depends on which
attempt worked; use a [state machine](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/state-machines.html) where the
object sits in one named situation at a time, and
[Choose](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/choosing-between-options.html) where options are scored.

A tree is made of **nodes**. Each node, when it runs, reports one of three things: **Running**, its
work is not finished yet; **Succeeded**; or **Failed**.

## Leaves: Task and Check

A block or a condition becomes a node only through one of the two leaves:

- `Task(block)` runs a block. An ordinary block, such as `Score.Add(1)`, runs once and the Task
  succeeds. An action that takes time, such as `Wait(2)`, keeps the Task Running until the action
  finishes, and the Task reports the action's result.
- `Check(condition)` reads a condition once: Succeeded when it is true, Failed when it is false.

```csharp
var alert = Task(Alerts.Inc());
var pause = Task(Wait(0.5));
var alive = Check(Health > 0);
```

## Composites: running several nodes

Three openers hold children. Each takes an optional ending:

| Opener | How the children run |
| --- | --- |
| `InOrder(a, b, ..)` | One after another, in the order written. |
| `InAnyOrder(a, b, ..)` | One after another, in an order shuffled each time the composite starts. |
| `InParallel(a, b, ..)` | All at the same time, advanced once each frame. |

| Ending | Result |
| --- | --- |
| none | Every child runs. Succeeded only when every child succeeded. |
| `.UntilOneFails()` | Ends Failed at the first child that fails; Succeeded when all succeed. |
| `.UntilOneSucceeds()` | Ends Succeeded at the first child that succeeds; Failed when all fail. |

`InOrder(..).UntilOneFails()` does steps in order and gives up at the first one that fails.
`InOrder(..).UntilOneSucceeds()` tries options in order and takes the first one that works. An
`InParallel` that ends early stops the children that are still running.

A composite that runs one child at a time remembers where it is: when a child is Running, the next
frame continues with that child, and the children before it do not run again.

## Wrappers: changing a result

- `Inverted(node)` swaps Succeeded and Failed.
- `AlwaysSucceeds(node)` and `AlwaysFails(node)` report that result once the node finishes, whatever
  the node reported.

While the wrapped node is Running, the wrapper is Running too; a wrapper changes a result, never when
it arrives.

## Repeat

`Repeat(node)` runs a node again after it finishes. It starts at most one new round per frame, so a
node that finishes at once repeats once each frame.

```csharp
var spin = Repeat(Task(Spins.Inc()));                 // until stopped
var knock = Repeat(Task(Knocks.Inc())).Times(3);      // three rounds
var opened = Repeat(Check(DoorOpen)).UntilSucceeds(); // until DoorOpen
var watch = Repeat(Check(Safe)).UntilFails();         // until Safe is false
```

`Times(n)` succeeds only if every round succeeded; a failed round does not stop the count.
`UntilSucceeds()` ends Succeeded and `UntilFails()` ends Failed: each ends with the result that
stopped it. A `Repeat` with no ending never finishes on its own.

## Starting, stopping and reading the result

`Behavior(name).Root(node)` returns the tree's handle. The name is what the debugger and error
messages call the tree.

- `tree.Start()` runs the tree from its root. Starting a running tree stops its current work first.
- `tree.Stop()` stops a running tree and leaves no result.
- `tree.IsActive` and `tree.Running` are true while the tree runs.
- `tree.Succeeded` and `tree.Failed` are true once the tree finished with that result, until the next
  Start. A stopped tree and one never started have neither.

A finished tree stays finished. To keep an object deciding for as long as it lives, put a `Repeat`
at the root:

```csharp
Guard = Behavior(nameof(Guard)).Root(
    Repeat(InOrder(watching, chase).UntilOneSucceeds()));
On.Ready(Guard.Start());
```

The tree runs once per frame, after `On.Update`, and a tree of Checks and immediate Tasks finishes in
the frame it starts. A paused script's trees stand still. A tree started in a state machine state's
Enter belongs to that state: the machine runs it and stops it when it leaves the state.

## Watching a condition while work runs

A `Check` reads its condition once. To keep checking while other work runs, repeat the Check beside
the work:

```csharp
var watching = InParallel(
    Repeat(Check(!IntruderNear)).UntilFails(),
    patrol).UntilOneFails();
```

The repeated Check reads `IntruderNear` every frame. When it becomes true the Check fails, the
`InParallel` ends Failed and stops the patrol. While the watch is running, a patrol that succeeds does
not end the group: the watch keeps it running.

## Reusing part of a tree

A node is a value. Keep one in a local or return one from a method, and place it where you need it:

```csharp
private BehaviorNode Visit(Vector3 post) => InOrder(
    Task(Goal.Set(post)),
    Repeat(Check(Arrived)).UntilSucceeds(),
    Task(Visits.Inc())).UntilOneFails();
```

Each place a node is used runs its own copy, with its own progress.

## Mistakes the compiler and the build catch

- A block or a condition written as a child without `Task` or `Check` does not compile.
- A node written where a block is expected, such as `On.Update(Task(..))`, does not compile.
- `InParallel(..)` of nodes has no `UntilOneFinishes()`; that ending belongs to routine groups.
- A node or a tree builder written as a statement is reported as unused (LUNY005), and
  `Behavior(name)` with no `Root` is reported unfinished (LUNY004) and refused when the script is
  built.
- A composite with no children is refused where it is written.
- A routine group with `OthersKeepRunning()` inside a `Task` is refused when the script is built;
  put it in a routine the Task starts.
- A `Times` count below 1, or not a whole number, stops the object with an error when that `Repeat`
  starts.

## Call list

These lines are signatures, not a script you can paste. `..` means one or more further nodes.

```csharp
tree = Behavior(name).Root(node)
tree.Start()   tree.Stop()
tree.IsActive  tree.Running  tree.Succeeded  tree.Failed
Task(block)    Check(condition)
InOrder(node, ..)    [ .UntilOneFails() | .UntilOneSucceeds() ]
InAnyOrder(node, ..) [ .UntilOneFails() | .UntilOneSucceeds() ]
InParallel(node, ..) [ .UntilOneFails() | .UntilOneSucceeds() ]
Inverted(node)  AlwaysSucceeds(node)  AlwaysFails(node)
Repeat(node) [ .Times(n) | .UntilFails() | .UntilSucceeds() ]
```

## What to read next

- The BehaviorTree scene in `Assets/CodeSmile/LunyScript/ApiExamples`: a guard that patrols, watches
  for an intruder, chases it and patrols again.
- [State machines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/state-machines.html) — one named situation at a
  time, with Enter and Exit.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — the `Wait`
  and routine groups a Task can run.
- Generated reference:
  [`BehaviorTree`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.BehaviorTree.html),
  [`BehaviorNode`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.BehaviorNode.html),
  [`BehaviorCompositeBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.BehaviorCompositeBuilder.html),
  [`BehaviorRepeatBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.BehaviorRepeatBuilder.html).
