# Flow: conditions, timed work and routines

Branch on a value, repeat on a cadence, and run steps one after another — all inside `Build()`:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Beacon : Script
{
    [Variable] public Number Flashes { get; private set; }

    protected override void Build() =>
        On.Ready(Run(Flashes.Increment()).Every(1).Start());
}
```

The counter goes up once per second, for as long as the object lives.

## Branching

`Charge` and `Shots` are `Number` variables, and `Powered`, `Armed` and `Fire` are `Flag`
variables:

<pre><code>Charge = Define.Number(nameof(Charge), 100);
Shots = Define.Number(nameof(Shots), 0);
Powered = Define.Flag(nameof(Powered), true);
Armed = Define.Flag(nameof(Armed), false);
Fire = Define.Flag(nameof(Fire), false);

On.Update(<strong>If(</strong>Charge &lt; 5<strong>).Then(</strong>Powered.Set(false)<strong>)</strong>);
On.Update(<strong>If(</strong>Charge &lt; 5<strong>).Then(</strong>Powered.Set(false)<strong>)
    .Else(</strong>Powered.Set(true)<strong>)</strong>);
On.Update(<strong>If(</strong>Armed &amp; Charge &gt; 10<strong>)
    .Then(</strong>Fire.Set(true), Shots.Increment()<strong>)</strong>);
</code></pre>

`If` takes a condition: a comparison, a `Flag`, or several combined with `&`, `|` and `!`. It is
incomplete without `Then`; an `If` used as a block with no branch is refused while `Build()` runs,
with a message naming the branch you left out. The condition is evaluated each time the `If` runs,
immediately before its children.

### Choosing one of several branches

`ElseIf` adds a branch after a `Then`, as many times as you need. `Level` is a `Number` variable:

<pre><code>Level = Define.Number(nameof(Level), 0);

On.Update(<strong>If(</strong>Charge &lt; 10<strong>).Then(</strong>Level.Set(0)<strong>)
    .ElseIf(</strong>Charge &lt; 50<strong>).Then(</strong>Level.Set(1)<strong>)
    .ElseIf(</strong>Charge &lt; 90<strong>).Then(</strong>Level.Set(2)<strong>)
    .Else(</strong>Level.Set(3)<strong>)</strong>);
</code></pre>

The conditions are tested in the order you wrote them, each one only when every condition before it
was false. The first true one runs its `Then` and ends the chain, so exactly one list runs: with
`Charge` at 30, `Charge < 50` is the first true condition and `Level` becomes 1, although
`Charge < 90` is true as well. `Else` runs when no condition was true. Without `Else`, a chain whose
conditions are all false runs nothing:

<pre><code>On.Update(<strong>If(</strong>Charge &lt; 10<strong>).Then(</strong>Powered.Set(false)<strong>)
    .ElseIf(</strong>Charge &gt; 90<strong>).Then(</strong>Powered.Set(true)<strong>)</strong>);
</code></pre>

`Else` ends the chain, so an `ElseIf` written after it does not compile. An `ElseIf` takes what
`If` takes, including a collection try such as `ElseIf(Spare.TryAdd(item))`, whose call runs only
when the chain reaches it.

Each `ElseIf` is an `If` inside the `Else` of the branch before it. The chain above builds the same
block as this nesting, and the
[debugger](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/debugging-a-running-script.html) shows it that way, one
level deeper for each `ElseIf`:

<pre><code>On.Update(<strong>If(</strong>Charge &lt; 10<strong>).Then(</strong>Powered.Set(false)<strong>)
    .Else(If(</strong>Charge &gt; 90<strong>).Then(</strong>Powered.Set(true)<strong>))</strong>);
</code></pre>

## Repeating work

`Run(block, ..)` declares work. `Start()` begins one activation of it, and `Stop()` ends it.

| Form | What it does |
| --- | --- |
| `Run(body)` | Runs the body every frame until stopped. |
| `Run(body).Over(3)` | Runs the body every frame for three seconds. |
| `Run(body).For(5)` | Runs the body on five frames. |
| `Run(body).Every(1)` | Runs the body once per second, until stopped. |
| `Run(body).Every(500).Milliseconds().For(5)` | Runs the body five times, half a second apart. |
| `Run(body).Every(1).Over(10)` | Runs the body once per second for ten seconds. |

```csharp
protected override void Build()
{
    var pulse      = Run(Pulse.Inc()).Over(3);
    var cadence    = Run(Cadence.Inc()).Every(1);
    var burst      = Run(Burst.Inc()).Every(500).Milliseconds().For(5);
    var continuous = Run(Continuous.Inc());

    On.Ready(pulse.Start(), cadence.Start(),
        burst.Start(), continuous.Start());
    On.Message("Quiet", continuous.Stop(), cadence.Stop());
}
```

Declaring the work is separate from starting it, so you can hold the declaration in a local and start
it from whichever event you like. `Start()` and `Stop()` are available at every point of the chain.

`Over` and `Every` measure game time, in seconds unless a unit call follows the amount: `Seconds()`,
`Milliseconds()`, `Minutes()` or `Hours()`. `For` counts activations, and `Times()` may follow it to
say so. `Over(3)` and `Over(3).Seconds()` are the same bound, and so are `For(5)` and
`For(5).Times()`. A count takes no time unit and a duration takes no `Times()`, so
`Run(body).For(3).Seconds()` does not compile: three seconds is `Over(3)`.

The same rule, an amount followed by at most one unit call with seconds as the default, is how every
duration is written: `Wait(2)`, `Transform.MoveTo(...).Over(2)`, `Motion.MoveTo(...).Over(2)`, a
volume fade's `Over(0.4)` and a selector's `Hold(1)`.

## Routines: steps in order, over several frames

A routine runs its steps in the order you wrote them, each one finishing before the next begins, over
as many frames as they need.

```csharp
protected override void Build() =>
    On.Ready(Routine("Door").Run(
        Opening.Set(true), Wait(3), Opening.Set(false)));
```

The name you pass to `Routine` is what a diagnostic message and the runtime inspector call it.

## Waiting inside a routine

`Wait` is a step that holds its routine for an amount of game time, then lets the next step run.

| Form | Waits for |
| --- | --- |
| `Wait(3)` | Three seconds. Seconds is the default unit. |
| `Wait(3).Seconds()` | Three seconds, with the unit written out. |
| `Wait(500).Milliseconds()` | Half a second. `Minutes()` and `Hours()` follow the same way. |
| `Wait(Delay)` | As many seconds as the `Delay` variable holds when the routine reaches the wait. |
| `Wait(Seconds(0.15))` | A duration value, the one `Hold` takes. |

```csharp
On.CollisionEnter(Routine("Flash").Run(
    Object.SetColor(1, 0.25, 0.25), Wait(0.15), Object.ResetColor()));
```

A wait counts game time from the moment the routine reaches it: a paused game stops it, and
`Time.SetScale(0.5)` makes it take twice as long. `Wait(0)` finishes at once. A negative amount, NaN
or an infinity also finishes at once and writes a warning to the Console.

### Where a wait goes

A wait belongs in a routine, a group, a `Run` body or a `Choose` option's action. Each of them waits for a wait to finish before it
runs its next step. `Then`, `Else` and an event list run all of their blocks one after another in the frame they are reached, so nothing
there waits for a wait:

```csharp
On.Ready(Routine("Blink").Run(
    If(ShouldBlink).Then(Light.Set(true), Wait(1), Light.Set(false))));   // refused
```

A `Then` inside a routine is still one step of that routine, and it runs its whole list in one frame. A wait written inside `Then` or
`Else`, or directly in an event list, is refused when the script type is built, before the first object running that script runs any
block. The error names the line of the wait and says what to do: move the wait out of `Then` so that it is a step of the routine. When
the wait is written directly in the list, your IDE and Unity's compiler also report it on its line as
[LUNY007](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/compile-time-checks.html#luny007).

To wait only when the condition holds, set a `Number` inside `Then` and give it to a wait written after the `If`. A wait of zero finishes
at once, so the routine goes straight on when the condition is false:

```csharp
On.Ready(Routine("Blink").Run(
    BlinkDelay.Set(0),
    If(ShouldBlink).Then(Light.Set(true), BlinkDelay.Set(1)),
    Wait(BlinkDelay),
    Light.Set(false)));
```

## Running steps at the same time

`InParallel` groups children that run at the same time. It belongs in a routine, another group, a
`Run` body or a `Choose` option's action. Inside `Then` or `Else`, or directly in an event list, it is
refused the way a wait is, because nothing there waits for the group to end.

| Ending | When the group ends |
| --- | --- |
| No clause | When every child has finished. The group succeeded if every child succeeded. |
| `.UntilOneFinishes()` | When the first child reaches any terminal state, whichever one that is. |
| `.UntilOneSucceeds()` | When the first child succeeds. A child that fails ends nothing on its own. |

```csharp
var bothDoors  = InParallel(openLeft, openRight);
var firstDone  = InParallel(openLeft, openRight).UntilOneFinishes();
var firstOpen  = InParallel(openLeft, openRight).UntilOneSucceeds();
var arrival = InParallel(moveCamera, fadeMusic)
    .UntilOneFinishes().OthersKeepRunning();

On.Ready(Routine("Arrival").Run(arrival, fadeInArrivalPanel));
```

`OthersKeepRunning()` comes after a terminal clause. Here `fadeInArrivalPanel` is a multi-frame
action, so the unfinished camera movement or music fade continues while that following step runs.
The enclosing routine owns the survivor and cancels it when the routine ends or is cancelled.

## Reading a group's outcome

A group publishes three conditions, and you read them by holding the group in a local:

```csharp
protected override void Build()
{
    var race = InParallel(reachExit, Wait(5)).UntilOneFinishes();

    On.Ready(Routine("Escape").Run(
        race,
        If(race.Succeeded).Then(RaceOver.Set(true)),
        If(race.Failed).Then(Alarm.Set(true)),
        If(race.Canceled).Then(Retryable.Set(true))));
}
```

Here `reachExit` is a multi-frame action that can fail, and the group ends with whichever child
finishes first. A wait that finishes reports Succeeded, so `race.Succeeded` is true after five
seconds whether or not the exit was reached: a finished wait says only that the time passed.

| Condition | True once the group has ended |
| --- | --- |
| `race.Succeeded` | Having met its objective. |
| `race.Failed` | Having reached a terminal state without meeting it. |
| `race.Canceled` | Having been cancelled. |

```csharp
If(race.Succeeded).Then(Escaped.Set(true));
If(race.Failed).Then(Alarm.Set(true));
If(race.Canceled).Then(Retryable.Set(true));
```

`Succeeded` is the one success word across the whole author-facing surface, so an operation handle,
an action result and a routine group all spell it the same way. `Canceled` carries one L, which is
the spelling .NET and Unity use.

## Sequences: several blocks as one

A sequence holds several blocks as one block. It runs them in the order you wrote them and does
what they would do written out in its place. There are three ways to write one:

```csharp
protected override void Build()
{
    // A named sequence. The name is what the debugger shows for it.
    DodgeRoll = Define.Sequence(Crouch.Set(true), Wait(0.2),
        Lane.Add(1), Wait(0.4), Crouch.Set(false));

    // A sequence without a name, held in a local.
    var hop = Sequence(Lift.Set(1), Wait(0.25), Lift.Set(0));

    // The same as Sequence(...): a tuple of 2 to 9 blocks.
    var blink = (Lamp.Set(true), Wait(0.1), Lamp.Set(false));

    On.Message("Dodge", Routine("Dodge").Run(DodgeRoll));
    On.Ready(Routine("Warm up").Run(hop, hop, blink, DodgeRoll));
}
```

`DodgeRoll = Define.Sequence(...)` in a `partial` script declares the `DodgeRoll` property for you,
the way a `Define.Number` line does. Assigned to a local instead, a `Define.Sequence` has no name,
and the script type is refused when it is built; write `Sequence(...)` for a sequence you do not
name.

Where a sequence is placed decides how its blocks run:

| Placed in | Its blocks run |
| --- | --- |
| An event list, a `When.*` body, `Then`, `Else` | All of them, in the frame the list runs. |
| A routine, a `Run` body, a `Choose` option | One after another, each finishing first. |
| An `InParallel` group | As one child, one after another. |

As a step of a routine, a `Wait` inside a sequence holds the routine, exactly as it would written
out in the routine. In an event list or a `Then` nothing waits, so a `Wait` or a group inside a
sequence placed there is refused when the script type is built, and the message names the sequence
to move. Written directly in the list, as in `On.Update((Lamp.Set(true), Wait(1)))`, it is also
reported on its line as [LUNY007](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/compile-time-checks.html#luny007).

In a group a sequence is one child, which is the one place it differs from its blocks written out:

```csharp
var sweep = InParallel((MoveOut.Set(1), Wait(1), MoveOut.Set(0)),
    Spin.Set(1));
```

The three blocks run one after another while `Spin.Set(1)` runs beside them, and the group ends
when the sequence's last block has finished. A sequence reports Failed when one of its blocks
reported Failed, after running the rest of them, so a group reads its outcome the way it reads
any child's.

A named sequence is one row in the
[debugger](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/debugging-a-running-script.html): the row reads
`DodgeRoll` and starts folded, so a long, tested sequence reads as one line until you unfold it.

## Using one block in several places

A block you hold in a local and place in two places behaves as if you had written it out at each
place. A routine started from two events is two routines, each with its own progress, a timed
move placed in two events is two moves, and a sequence placed in two routines is two sequences:

```csharp
var tour = Routine("Tour").Run(Starts.Increment(), walk, Ends.Increment());
On.Ready(tour);
On.Message("Again", tour);    // a second routine, as if written out here
```

Inside one routine, a group's `Succeeded`, `Failed` and `Canceled` read the copy of the group that
the same routine runs, so the second routine above can read its own outcome.

Something you declare keeps one identity wherever you name it: a variable, a `Run(...)` work, an
audio voice, a UI element and an operation. Every `Start()` and `Stop()` of one `Run` names the one
work, which is also how one routine is restarted from two events:

```csharp
var go = Run(tour).For(1);
On.Ready(go.Start());
On.Message("Again", go.Start());    // restarts the one routine
On.Message("Halt", go.Stop());      // stops the work both starts named
```

## What to read next

- [Choosing between options](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/choosing-between-options.html) — pick an
  action by score instead of by condition.
- [Behaviour trees](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/behaviour-trees.html) — try options in order and
  fall back when one fails; a Task runs a `Wait` or a routine group as one of its nodes.
- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) — the same
  outcome words on work that leaves the process.
- Generated reference:
  [`IfBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.IfBuilder.html),
  [`IfThenBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.IfThenBuilder.html),
  [`RunBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.RunWorkBuilder.html),
  [`RoutineBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.RoutineBuilder.html),
  [`Sequence`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Sequence.html),
  [`WaitBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.WaitBuilder.html),
  [`ActionResult`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ActionResult.html).
