# State machines

Open a door while the player is near and close it again when they leave:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Door : Script
{
    protected override void Build()
    {
        PlayerNear = Define.Flag(nameof(PlayerNear), false);
        (Hatch, Shut, Open) = Define.StateMachine(nameof(Hatch))
            .WithStates(nameof(Shut), nameof(Open));

        Hatch.Initial(Shut);
        Hatch.From(Shut).To(Open).When(PlayerNear);
        Hatch.From(Open).To(Shut).When(!PlayerNear);
        Hatch.State(Open)
            .Enter(Transform.Child(0).SetLocalPosition(0, 2, 0))
            .Exit(Transform.Child(0).SetLocalPosition(0, 0, 0));

        On.Ready(Hatch.Start());
    }
}
```

The one line after `PlayerNear` declares the machine `Hatch` and its two states. `Hatch.Start()`
enters `Shut`. While `PlayerNear` is true the machine moves to `Open`, whose Enter lifts the door;
when it turns false the machine moves back, and `Open`'s Exit lowers the door.

## What a state machine is for

A state machine keeps an object in exactly one of a few named situations at a time, and says how it
moves from one to another. Use it where the alternative is a Number that stores a phase and an `If`
per phase, with extra flags to remember whether a phase's first frame has run: a boss's phases, a
door, a character's idle, walk and jump, a menu's screens.

Each state has three lists, all optional: **Enter** runs once when the machine enters the state,
**Update** runs while it stays, and **Exit** runs once when it leaves. **Transitions** say when the
machine leaves.

## Declaring the machine and its states

A machine and its states are declared on one line, and the generator writes a property for each
name: a `StateMachine` for the machine and a `State` for each state. A state belongs to the machine
that declared it, so a misspelt state does not compile and a state of one machine cannot be passed
to another.

```csharp
(Phases, Calm, Angry, Beaten) = Define.StateMachine(nameof(Phases))
    .WithStates(nameof(Calm), nameof(Angry), nameof(Beaten));
Phases.Initial(Calm);
```

Pass `nameof(...)` for each name, in the order the handles are written; the compiler reports a name
that does not match its handle. A machine has one to sixteen states. Every machine names the state
`Start` enters with `Initial`, once; a machine without one is refused when the script is built.

Declaring a machine does nothing on its own. It runs after a `Start` block runs:

```csharp
On.Ready(Phases.Start());
```

## Enter, Update and Exit

```csharp
Roar = Define.Routine();
Phases.State(Angry)
    .Enter(Speed.Set(3), Routine(Roar).Run(Roaring.Set(true),
        Wait(1), Roaring.Set(false)))
    .Update(Transform.RotateBy(0, 90, 0))
    .Exit(Speed.Set(1));
```

Write the three lists in this order, each at most once per state. Enter runs in the frame the machine
enters the state. Update runs once in every later frame the state is current and no transition is
taken. Exit runs when the machine leaves the state.

**A routine, `Choose`, `Run` or behaviour tree started in Enter belongs to the state.** The machine
runs it in each frame before Update, and stops it when the machine leaves the state, so the roar
above never outlives `Angry`. Entering the state again starts it again.

The three lists run their blocks one after another in one frame, like an `If`'s `Then`. A `Wait` or an
`InParallel` group written in them is refused; put the waiting in a routine that Enter starts, as the
roar does.

## Transitions

```csharp
Phases.From(Calm).To(Angry).When(Health < 60);
Phases.From(Angry).To(Beaten).When(Health <= 0).Do(Score.Add(100));
Phases.To(Calm).When(Reset);
Phases.State(Angry).When(HitTaken).Do(HitTaken.Set(false));
```

| Transition | When it is taken |
| --- | --- |
| `From(a).To(b).When(condition)` | In state `a`, while the condition is true. |
| `To(b).When(condition)` | In any state except `b`, while the condition is true. |
| `State(a).When(condition)` | In state `a`, while the condition is true. It stays in `a`. |

Each frame the machine reads the transitions in the order they are written and takes the first one
that applies; it reads no condition after that one. Only when none applies does it run the state's
Update. So a write Update makes is seen by the transitions in the next frame.

Taking a transition to another state stops the work the old state's Enter started, runs the old
state's Exit, runs the transition's `Do`, then runs the new state's Enter. `Do` is optional. The new
state's Update runs from the next frame on.

The last form, `State(a).When(...)`, stays in the state: it runs only its `Do`, with no Exit and no
Enter, and the state keeps what its Enter started. `From(a).To(a)` does the same.

## Reading the state

```csharp
On.Update(If(Phases.IsIn(Angry)).Then(Rage.Add(Time.Delta)));
On.Update(If(!Phases.IsRunning).Then(Phases.Start()));
```

`IsIn(state)` is true while the machine runs and that state is current. `IsRunning` is true after a
`Start` and before a `Stop`. Another machine on the same object reads these, or a variable one of the
states writes, to follow it.

## Starting, stopping and restarting

`Start()` enters the initial state and runs its Enter in the same frame. The machine takes its first
transition or runs its first Update in the next frame. `Start()` on a running machine restarts it:
it leaves the current state the way a transition does, then enters the initial state again.

`Stop()` stops the current state's work and runs its Exit, and the machine does nothing more until the
next `Start()`. Stopping a stopped machine does nothing.

A machine does not start or stop itself: `Phases.Stop()` written in one of `Phases`' own lists is
refused when the script is built. Stop it from outside:

```csharp
On.Update(If(Phases.IsIn(Beaten)).Then(Phases.Stop()));
```

A state with no transitions out of it keeps the machine there, which is usually all a final state
needs.

When the object is despawned, the machine ends with it and no Exit runs.

## Several changes in one frame

By default the machine takes at most one transition per frame. `CascadeLimit(n)` lets it take up to
`n`, running each new state's transitions in the same frame:

```csharp
Parser.Initial(Scanning).CascadeLimit(10);
```

The machine stops before a transition back to a state it has already been in during that frame; that
transition is read again in the next frame. `CascadeLimit(0)` is the largest limit, 100.

## Which frame update

A machine runs in the frame update, after `On.Update`. Write `InFixedUpdate()` to run it in each
fixed step instead, after `On.FixedUpdate`, where Motion's physics writes are allowed; or
`InLateUpdate()` to run it after `On.LateUpdate`, for a camera that follows something that already
moved:

```csharp
Movement.Initial(Idle).InFixedUpdate();
Follow.Initial(Track).InLateUpdate();
```

A machine that moves a body and one that follows it with the camera are two machines, each on its own
update. A paused script's machines stand still, like its `On.Update`.

## Call list

These lines are signatures, not a script you can paste. `..` means one or more further blocks or
names.

```csharp
(machine, state, ..) = Define.StateMachine(name).WithStates(name, ..)
machine.Initial(state) [ .CascadeLimit(n) ] [ .InFixedUpdate()
    | .InLateUpdate() ]
machine.State(state) [ .Enter(block, ..) ] [ .Update(block, ..) ]
    [ .Exit(block, ..) ]
machine.From(state).To(state).When(condition) [ .Do(block, ..) ]
machine.To(state).When(condition) [ .Do(block, ..) ]
machine.State(state).When(condition) [ .Do(block, ..) ]
machine.Start()      machine.Stop()
machine.IsIn(state)  machine.IsRunning
```

## What to read next

- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — the
  routines a state starts, and the `Wait` they hold for.
- [Choosing between options](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/choosing-between-options.html) — score
  several actions each frame instead of naming states.
- [Behaviour trees](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/behaviour-trees.html) — try options in order and
  fall back when one fails; a tree a state's Enter starts belongs to that state.
- Generated reference:
  [`StateMachine`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.StateMachine.html),
  [`State`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.State.html),
  [`StateBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.StateBuilder.html).
