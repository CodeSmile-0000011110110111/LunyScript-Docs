# Choosing between options

Score two actions and run whichever scores higher, every frame:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Worker : Script
{
    [Variable(1)] public Number WorkScore { get; private set; }
    [Variable(0)] public Number RestScore { get; private set; }

    protected override void Build()
    {
        Block work = Motion.MoveTo(4, 0, 0).AtSpeed(2);
        Block rest = Motion.MoveTo(0, 0, 6).AtSpeed(1);

        On.Ready(Choose("needs").Highest(
            Option(WorkScore).Then(work),
            Option(RestScore).Then(rest)));
    }
}
```

Write to `WorkScore` and `RestScore` from anywhere and the character switches between the two
actions on its own.

## What Choose is for

`Choose` evaluates a score for each option every frame and runs the action belonging to the current
winner. Use it where the alternative would be a chain of `If` branches whose order encodes a priority
you would rather express as a number: which target to attack, whether to eat or sleep, which cover
point to take.

The subject you pass to `Choose` is what a diagnostic message and the runtime inspector call this
selector. A blank subject is refused while `Build()` runs.

## Options

The signature is in the [call list](#call-list) at the end of this page. The score is a number
expression, so it can be a variable, an arithmetic expression, or anything the value surface
produces:

```csharp
Option(Hunger).Then(eat)
Option(Hunger * 2 - Fatigue).Then(eat)
Option(Math.Clamp(DistanceToCover, 0, 10)).Then(takeCover)
```

Every finite signed score is legal, including negative ones. An `Option` without its `Then` is
refused when the option list is taken.

`Highest(option, ..)` takes the options in declaration order and picks the largest finite score. Two
options with the same score keep the one written first.

## Keeping the winner from flipping

Two optional clauses stop the selection oscillating when two scores sit close together. Write them in
either order.

| Clause | What it does |
| --- | --- |
| `.Bias(margin)` | A challenger must exceed the current winner by this margin before it takes over. |
| `.Hold(amount)` | The current winner is kept for at least this long, whatever the scores do. |

```csharp
// Without either clause, work and rest swap every frame the scores cross.
Choose("needs").Highest(
    Option(WorkScore).Then(work),
    Option(RestScore).Then(rest));

// A challenger must beat the winner by 0.1 before it takes over.
Choose("needs").Highest(
    Option(WorkScore).Then(work),
    Option(RestScore).Then(rest)).Bias(0.1);

// The winner is kept for at least one second, whatever the scores do.
Choose("needs").Highest(
    Option(WorkScore).Then(work),
    Option(RestScore).Then(rest)).Hold(1);

// Both: a one-second minimum, then a 0.1 margin to take over.
Choose("needs").Highest(
    Option(WorkScore).Then(work),
    Option(RestScore).Then(rest)).Bias(0.1).Hold(1);
```

`Bias` takes a finite margin of at least zero, in the same units as the scores; leaving it out is the
same as zero. `Hold` takes an amount in seconds, and a unit call may follow it: `Hold(1)` and
`Hold(1).Seconds()` are the same hold, and `Hold(500).Milliseconds()`, `Hold(2).Minutes()` and
`Hold(1).Hours()` name the other units. `Hold` also takes a duration value built by `Seconds`,
`Milliseconds`, `Minutes` or `Hours`, which every script carries, so `Hold(Seconds(1))` is the same
hold again. Leaving `Hold` out is the same as zero. The converted hold must be finite and at least
zero; anything else is refused while `Build()` runs. The hold runs out first, and the bias then
governs the handover.

## Call list

This line is a signature, not a script you can paste. `..` means one or more further blocks. The
working options are under Options, above.

```csharp
Option(score).Then(block, ..)
Choose(subject).Highest(option, ..)
    [ .Bias(margin) ] [ .Hold(amount) [ .Seconds() ] ]
```

Bias and Hold may be written in either order. In place of `.Seconds()`, `.Milliseconds()`,
`.Minutes()` or `.Hours()` names another unit, and `.Hold(Seconds(amount))` takes a duration value.

## What to read next

- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — the blocks
  an option runs.
- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — building the
  expression that produces a score.
- Generated reference:
  [`ChooseBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ChooseBuilder.html),
  [`ChooseHighestBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ChooseHighestBuilder.html),
  [`UtilityOptionBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.UtilityOptionBuilder.html).
