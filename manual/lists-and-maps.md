# Lists and maps

Declare a collection with a capacity and use it straight away:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Inventory : Script
{
    public ListHandle<Number> Slots { get; private set; }

    protected override void Build()
    {
        Slots = Define.List<Number>(nameof(Slots), 4);

        On.Ready(Slots.Add(1), Slots.Add(2));
    }
}
```

The list holds up to four numbers and starts empty. Every object assigned to `Inventory` gets its
own four slots.

## What a collection is

A LunyScript collection has a capacity chosen while `Build()` runs and an occupancy that starts at
zero. Adding, removing and reading allocate nothing at runtime, which is why the capacity is fixed
rather than grown on demand.

The C# type is `ListHandle<T>`, and the map's is `MapHandle<TKey, TValue>`. They carry the word
`Handle` because `List<T>` is already `System.Collections.Generic.List<T>` and a script that used
both names would have to qualify one of them on every line.

Hold the handle in a property of the script, rather than in a local, when a later event needs to name
it.

## Declaring

The signature of these calls, including the optional length clauses, is in the
[call list](#call-list) at the end of this page.

```csharp
Slots  = Define.List<Number>(nameof(Slots), 4);
Names  = Define.List<Text>(nameof(Names), 8).ValueLength(TextLength.S);
Scores = Define.Map<Text, Number>(nameof(Scores), 8).KeyLength(TextLength.S);
Loadout = Define.Map<Weapon, Number>(nameof(Loadout), 4);
```

A list element is a `Number`, a `Flag`, a `Text` or one of your own C# enums. A map key is a `Flag`, a
finite `Number`, a `Text` or an enum, and a map value is the same set as a list element. The capacity
is required and is at least 1.

`ValueLength` and `KeyLength` size whichever side is `Text`, using `TextLength.XS`, `S`, `M`, `L` or
`XL`, which correspond to the 32-, 64-, 128-, 512- and 4096-byte capacities described in
[Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html).

## Reading and changing a list

```csharp
Equipped.Set(Slots.At(0));                   // the element at an index
If(Slots.Contains(2)).Then(HasTwo.Set(true));
Held.Set(Slots.Count);                       // occupancy, which starts at zero

Slots.Add(3);          // appends
Slots.Set(0, 9);       // replaces the element at an index
Slots.RemoveAt(1);
Slots.Clear();         // empties the list and keeps its capacity
```

`Slots.Capacity`, `Slots.Name` and `Slots.IsDeclared` are plain C# values you read while `Build()`
runs, rather than blocks. `IsDeclared` is false for a handle that `Build()` never assigned.

## Reading and changing a map

```csharp
Wave.Set(Scores.At("wave"));
If(Scores.Contains("wave")).Then(Seen.Set(true));
Pairs.Set(Scores.Count);

Scores.Set("wave", 3);      // inserts or replaces
Scores.Remove("wave");
Scores.Clear();
```

`At`, `Contains`, `Set` and `Remove` each accept the five key kinds: a number, a flag, a typed key, an
enum expression and text.

## When a call cannot do what you asked

Adding past the capacity, or reading an index or a key that is not there, does not throw. The read
yields the element kind's default, the mutation leaves the content as it was, and the collection sets
a flag you can test:

```csharp
On.Update(
    Slots.Add(newItem),
    If(Slots.Failed()).Then(Overflowed.Set(true)));
```

`Failed()` is one flag for the whole collection, set by a refused call and cleared by the next
successful mutation on that same collection. `Contains` is a read and leaves the flag alone.

## Branching on one add

`TryAdd` is the form of `Add` whose own outcome you branch on. Give it to `If`:

```csharp
Pickup = Define.Message();
On.Message(Pickup,
    If(Slots.TryAdd(item))
        .Then(Kept.Increment())
        .Else(ShowFull.Set(true)));
```

Each time the block runs it adds the item once. `Then` runs when that add changed the list, and
`Else` runs when the list refused it, for example because it is full or a `ForEach` is visiting
it. The branch depends on this add alone, so an earlier refusal elsewhere on the list does not
change it.

To read the outcome later, store it in a named result:

```csharp
public CollectionResult Added { get; private set; }

// Inside Build():
Added = Define.CollectionResult(nameof(Added));

Pickup = Define.Message();
On.Message(Pickup, Slots.TryAdd(item).As(Added));
On.Update(
    If(Added).Then(Glow.Set(true)),
    If(Added.Failed).Then(ShowFull.Set(true)));
```

`If(Added)` means `If(Added.Succeeded)`. Before the add first runs, both `Added.Succeeded` and
`Added.Failed` are false. After that, `Added` keeps the latest outcome until the add runs again.
Reading it adds nothing. Every object has its own result, and a pooled object that is reused
starts over with both false.

Each `TryAdd` is used once, by one `If` or one `.As`. An `If` over a `TryAdd` that you place in two
places adds once at each place, as writing it out twice would. A result has one `TryAdd` bound to
it, so the block `.As` produces goes in one place. `Build()` reports a `TryAdd` used twice or never
placed, an `.As` block placed twice, and a result with no `TryAdd` or two, naming the line. A
refused `TryAdd` writes nothing to the Console, because your `Else` or your result is where you
handle it; a refused `Add` still reports its first refusal.

## Visiting every entry

```csharp
ForEach(Slots).Do(item => Total.Add(item));
ForEach(Slots).Do(item => new[] { Total.Add(item), Counted.Increment() });

ForEach(Scores).Do((key, value) => Total.Add(value));
ForEach(Scores).Do((key, value) =>
    new[] { Total.Add(value), Highest.Max(value) });
```

The lambda runs once, while `Build()` runs, to compose the body. At runtime the composed body is
applied to each entry, so the lambda itself is never called per element.

A loop visits the entries present when it starts, in index order for a list and in insertion order
for a map. Writing a `ForEach` inside another `ForEach` is refused while `Build()` runs, as is a
handle that `Build()` never assigned.

## A worked example

```csharp
using CodeSmile.LunyScript;

public sealed partial class Scoreboard : Script
{
    public MapHandle<Text, Number> Scores { get; private set; }
    [Variable] public Number Total { get; private set; }
    [Variable] public Number Best { get; private set; }
    [Variable] public Number Wave { get; private set; }

    protected override void Build()
    {
        Scores = Define.Map<Text, Number>(nameof(Scores), 8)
            .KeyLength(TextLength.S);

        On.Ready(Scores.Set("wave", 0), Scores.Set("bonus", 0));

        WaveCleared = Define.Message();
        On.Message(WaveCleared,
            Wave.Set(Scores.At("wave")),
            Wave.Increment(),
            Scores.Set("wave", Wave));

        On.Update(
            Total.Set(0),
            Best.Set(0),
            ForEach(Scores).Do((key, value) =>
                new[] { Total.Add(value), Best.Max(value) }));
    }
}
```

## Call list

These lines are declaration signatures, not a script you can paste. Brackets mark a clause you may
leave out. The working declarations are under Declaring, above.

```csharp
Define.List<T>(name, capacity)
    [ .ValueLength(length) ]
Define.Map<TKey, TValue>(name, capacity)
    [ .KeyLength(length) ] [ .ValueLength(length) ]
```

## What to read next

- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — the kinds a
  collection can hold.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — branching
  on `Failed()` and on `Contains`.
- Generated reference:
  [`ListHandle<T>`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ListHandle-1.html),
  [`CollectionResult`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CollectionResult.html),
  [`MapHandle<TKey, TValue>`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MapHandle-2.html),
  [`CollectionRead`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CollectionRead.html),
  [`TextLength`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.TextLength.html).
