# Random numbers

Draw a number into a variable:

```csharp
using CodeSmile.LunyScript;

public sealed partial class LootDrop : Script
{
    [Variable] public Number Roll { get; private set; }

    protected override void Build()
    {
        var loot = Random.Stream("loot", 42);

        On.Ready(Random.Number().From(loot).In(1, 100).Into(Roll));
    }
}
```

`Roll` holds a number from 1 up to but excluding 100. Seed 42 produces the same number on every run
of this stream, which is what makes the result reproducible while you are testing. `On.Ready` runs
once per spawn, so a pooled object that respawns draws again.

## What a stream is

A stream is a named source of random numbers that advances independently of every other stream, so a
drop table and a camera shake each keep their own reproducible sequence whatever the other one
draws.

```csharp
var loot = Random.Stream("loot", 42);   // a seed: the same draws every run
var shake = Random.Stream("shake");     // no seed given
```

A stream name is unique within a script; two streams with the same name are refused while `Build()`
runs. A seed is a `UInt32`, and 0 is stored as 1. Leaving the seed out derives it from the session
seed, the object's spawn index and the stream name, so two objects running the same script draw
differently from each other and each of them repeats on a rerun of the same session seed.

## The four kinds of draw

Every draw names its stream with `From`, and the variable it writes with `Into`. The chain is
incomplete until both are present.

| Draw | What it produces |
| --- | --- |
| `Random.Number()` | A number in a half-open range. |
| `Random.Index()` | A whole number from 0 up to but excluding a count. |
| `Random.Choice(option, ..)` | One of the values you listed. |
| `Random.Weighted(option, ..)` | One of the values you listed, at the weights you gave. |

```csharp
Random.Number().From(loot).In(1, 100).Into(Roll);
Random.Index().From(loot).In(3).Into(Pick);
Random.Choice(1, 2, 5).From(loot).Into(Drop);
Random.Weighted(10, 20, 30).WithWeights(70, 25, 5).From(loot).Into(Rare);
```

`In(minInclusive, maxExclusive)` refuses a minimum at or above the maximum, and refuses NaN and an
infinity, when the block runs. `Index().In(count)` needs a count of at least 1 and writes a value from
0 to `count - 1`. `Choice` refuses an empty option list while `Build()` runs. `Weighted` takes one
weight per option, skips a weight of zero or less when it runs, and refuses a draw where no weight is
usable.

## Choosing between two outcomes

A weighted draw over 0 and 1 is how you branch on a probability:

```csharp
On.Ready(
    Random.Weighted(0, 1).WithWeights(70, 30).From(loot).Into(WeaponPick),
    If(WeaponPick == 0)
        .Then(Equipped.Set(Weapon.Sword))
        .Else(Equipped.Set(Weapon.Bow)));
```

The result stays in `WeaponPick`, so later reads see the same draw. Draw again when you want a new
value.

## What to read next

- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — the variable a
  draw writes into.
- [Lists and maps](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/lists-and-maps.html) — pair `Random.Index()` with
  `list.At(index)` to pick an element.
- Generated reference:
  [`RandomFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.RandomFactory.html),
  [`RandomStream`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.RandomStream.html).
