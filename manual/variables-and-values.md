# Variables and values

Declare a variable with one line and write to it with one call:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Battery : Script
{
    protected override void Build()
    {
        Charge = Define.Number(nameof(Charge), 40);

        On.Update(Charge.Subtract(Time.Delta * 2));
    }
}
```

The battery starts at 40 and drains by two per second. The class is `partial`, so LunyScript's code
generator reads the `Charge = Define.Number(...)` line and writes the property it assigns,
`public Number Charge { get; private set; }`, into the other half of the class. Every object assigned
to `Battery` gets its own `Charge`. The `40` is where each object starts. It is not a field on the
`LunyScript Behaviour` component. That component's Inspector fields are the script, the declared
assets, and the process mode.

`Time.Delta` is the scaled frame length, so the drain stops while the game is paused. Battery sets
no process mode, so it is `Pausable` unless a parent script names another mode;
[Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html) covers the modes.

## What a variable is

A variable is a named, typed slot that belongs to one object. `Number` is the handle you hold in
the script; the number itself lives in the running object's slot storage. That separation is what
lets `Build()` run once for the whole script type while each object keeps its own value.

Every number in LunyScript is a `Double`, so a script writes `0.5` and never `0.5f`. `Vector2` and
`Vector3` store `Single` components and accept `Double` in their constructors, methods and
operators, so a script writes plain numbers there too.

## The kinds a variable can hold

| Kind | What it holds | Example |
| --- | --- | --- |
| `Number` | A `Double`. | `Health = Define.Number(nameof(Health), 100);` |
| `Flag` | True or false. | `Powered = Define.Flag(nameof(Powered), true);` |
| `Text` | Characters: a string that grows, or UTF-8 bytes in a fixed slot when you name a byte count. | `Readout = Define.Text(nameof(Readout));` |
| `Vector2`, `Vector3` | Two or three components. | `Probe = Define.Vector3(nameof(Probe), new Vector3(0, 1, 0));` |
| `Rotation` | An orientation. | `Facing = Define.Rotation(nameof(Facing), Rotation.Euler(0, 90, 0));` |
| `Color` | Four channels from 0 to 1. | `Tint = Define.Color(nameof(Tint), Color.Red);` |
| A C# `enum` | One of your own enum members. | `Equipped = Define.Enum<Weapon>(nameof(Equipped), Weapon.Sword);` |

## Three ways to declare

The `Define` line is the short one, for every kind in the table. Write it inside `Build()` of a
`partial` script, and the generator writes the property the line assigns: a `Number`, `Flag` or
`Text`, or the `Var<T>` of the other kinds, such as `Var<Vector3>` or `Var<Color>`. The line runs where it
stands, so the variable exists from that line on; use it on a later line. Pass `nameof` of the
variable, because the name is the property's name and names are unique within a script.

```csharp
Hits = Define.Number(nameof(Hits));
Health = Define.Number(nameof(Health), 100);
Armed = Define.Flag(nameof(Armed), true);
Log = Define.Text(nameof(Log), TextCapacity.Bytes512);
Home = Define.Vector3(nameof(Home), new Vector3(-4.2, 0.5, 0.0));
Tint = Define.Color(nameof(Tint), new Color(1, 0.8, 0.2));
Equipped = Define.Enum(nameof(Equipped), Weapon.Sword);
```

The compiler reports a mistake on the line itself: a use of `Health` above its `Define` line, a
second `Define` line for `Health`, `nameof` of a different name, or a class that is not `partial`.

The attribute form declares the same variables on properties you write, before `Build()` runs:

```csharp
[Variable] public Number Hits { get; private set; }
[Variable(100)] public Number Health { get; private set; }
[Variable(true)] public Flag Armed { get; private set; }
[Variable(Capacity = TextCapacity.Bytes512)]
public Text Log { get; private set; }
```

A variable in a class that is not `partial` is a property you write and assign with `Define`
inside `Build()`:

```csharp
public Var<Vector3> Home { get; private set; }

protected override void Build()
{
    Home = Define.Vector3(nameof(Home), new Vector3(-4.2, 0.5, 0.0));
    TeamScore = Define.Number(nameof(TeamScore)).Shared();
}
```

`Number Five = 5;` and `Flag Always = true;` are constant inputs: they read the same value on every
object, have no slot, and a write to them is refused.

## Sharing one value between objects

`.Shared()` puts the value in a store that every object can reach, instead of in this object's own
slots. A second script reaches that value with `Bind`:

```csharp
// The script that owns the declaration.
TeamScore = Define.Number(nameof(TeamScore)).Shared();

// Any other script, in its own Build().
Score = Bind.Number(nameof(ScoreKeeper.TeamScore)).Shared();
```

`Shared()` with no argument uses the default store, which needs no declaration. To keep a separate
group apart, declare a store and pass it; another script names that store through the descriptor
the generator writes for it:

```csharp
// MatchScript
MatchData = Define.Store();
Score = Define.Number(nameof(Score), 0).Shared(MatchData);

// HudScript
Score = Bind.Number(nameof(Score)).Shared(MatchScript.Stores.MatchData);
```

A store is the declaring script and its declared name, so two scripts that each declare their own
`MatchData` hold two stores, and a misspelt store is a compile error. `Shared.Clear(MatchData)`
resets one store to its declared defaults, and `Shared.Clear()` the default store. `Bind` always
names a store, because a bound value is by definition one that another script declared. A data
asset's values are shared the same way with `Bind.Data(schema).Shared()`; the
[Custom data and files](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/custom-data-and-files.html) page has the rules.

A `Vector3` and a text variable are shared the same way. Here a player publishes its position and a
guard reacts when the player comes within 4 units of its post:

```csharp
// PlayerScript
PlayerPosition = Define.Vector3(nameof(PlayerPosition)).Shared();
Alert = Define.Text(nameof(Alert), TextCapacity.Bytes128).Shared();
On.FixedUpdate(PlayerPosition.Set(Vector3.From(Transform.WorldPositionX,
    Transform.WorldPositionY, Transform.WorldPositionZ)));

// GuardScript
PlayerPosition = Bind.Vector3(nameof(PlayerPosition)).Shared();
Alert = Bind.Text(nameof(Alert), TextCapacity.Bytes128).Shared();
Post = Define.Vector3(nameof(Post), new Vector3(3, 0.5, 0));
On.FixedUpdate(If(PlayerPosition.DistanceTo(Post) <= 4)
    .Then(Alert.Set("The east guard sees you")));
```

A shared text grows when it is declared without a byte count: `Define.Text(name)` and `Bind.Text(name)`
hold one string on the store. `Define.Text(name, capacity)` and `Bind.Text(name, capacity)` hold a fixed
size instead. Every script that declares one shared text declares it the same way, growing or with the
same capacity, or the script built second is refused. A
store holds one variable per name, so declaring `PlayerPosition` as a shared `Number` in a third
script is refused too. `Shared.Clear` resets a shared `Vector3` to the default its `Define` gave it and
empties a shared text. C# reads both through `behaviour.GetVector3` and `behaviour.ReadText`, as it
reads a variable of the object's own.
[Reading a shared variable](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html#reading-a-shared-variable)
shows a `MonoBehaviour` that reads and observes a shared score through an object assigned in the
Inspector.
`Assets/CodeSmile/LunyScript/ApiExamples/Perception.unity` runs this with two guards that chase the
player.

## Writing a variable

```csharp
Charge.Set(40);      // a literal, another variable, or an expression
Charge.Add(20);      Charge.Subtract(5);   Charge.Sub(5);
Charge.Multiply(1.5); Charge.Mul(1.2);
Charge.Divide(2);    Charge.Div(2);        Charge.Remainder(10);
Charge.Negate();
Charge.Increment();  Charge.Inc();         Charge.Decrement();   Charge.Dec();
Charge.Min(25);      Charge.Max(30);       Charge.Clamp(0, 20);
Charge.Abs();        Charge.Floor();       Charge.Ceiling();
Charge.Truncate();
Charge.Round();      Charge.Round(RoundingMode.AwayFromZero);
Powered.Toggle();
Log.Clear();
```

The short and long spellings are the same call, so pick one and keep to it. Dividing by zero follows
IEEE arithmetic and produces an infinity. `Round()` sends a midpoint to the nearest even number;
`Round(RoundingMode.AwayFromZero)` sends 22.5 to 23.

## Reading a variable in an expression

Operators build an expression that is evaluated when the block runs:

```csharp
On.Update(
    If(Charge < 5).Then(Powered.Set(false)),
    If(Charge > 10 & Armed).Then(Hits.Increment()),
    Ratio.Set(Charge / MaxCharge));
```

Use the single-character `&`, `|` and `!` to combine conditions. `&&` and `||` have no meaning here,
because a short-circuit would have to pick a side while `Build()` runs, before any value exists.

A `Flag` is itself a condition, so `If(Powered)` and `If(Powered.IsTrue())` are the same test.
`If(!Powered)` and `If(Powered.IsFalse())` are the opposite test, and are the same as each other:

```csharp
On.Update(If(!Powered).Then(OffSeconds.Add(Time.Delta)));
```

A condition can also be written into a flag. `Set` takes a flag, `true`, `false` or a condition, and
writes what the condition says when the block runs. Placed in `On.Update`, the flag follows the
condition every frame, and `When.Var(Lit).Changed` runs only on the frames where its value changed.

<pre><code>Lit = Define.Flag(nameof(Lit), false);

On.Update(<strong>Lit.Set(Charge &gt; 10 &amp; !Powered)</strong>);
</code></pre>

## Math as expressions

Every `Math` call returns a value instead of writing one, so it composes into an assignment or a
condition:

```csharp
Ratio.Set(Math.Clamp(Charge / 10, 0, 1));
Smoothed.Set(Math.Lerp(Smoothed, Charge, Math.Min(1, Time.Delta * 5)));
If(Math.IsNaN(Ratio) | !Math.IsFinite(Ratio)).Then(Ratio.Set(0));
```

`Math` offers `Abs`, `Floor`, `Ceiling`, `Truncate`, `Min`, `Max`, `Clamp`, `Round`, `Lerp`, `Slerp`,
`IsFinite` and `IsNaN`. `Lerp` has overloads for `Number`, `Vector2` and `Vector3`, and its fraction may sit
outside 0 to 1, which extrapolates past the endpoints. `Slerp` takes the shortest arc between two
`Rotation` values.

## Vectors and rotations

```csharp
Probe.Set(Vector3.From(-2, -1, 0));   // an expression, read when the block runs
Probe.Set(Probe.WithY(1.5));       // one component replaced
Distance.Set(Probe.DistanceTo(Target));
Forward.Set(Facing.ApplyTo(new Vector3(1, 0, 0)));
Facing.Set(Rotation.Euler(0, 90, 0));
Facing.Set(Rotation.Euler(Heading));  // a Vector3 of degrees
Angle.Set(Facing.AngleTo(Rotation.Identity));
```

`new Vector3(x, y, z)` takes `Double` literals and produces a constant. `Vector3.From(x, y, z)` takes
number expressions and produces a value computed when the block runs, which is what you use to build
a position out of variables. `Vector2` has the same pair. `Rotation.Euler(degrees)` takes the three
angles as one `Vector3`, in the layout `ToEuler()` returns.

Every Transform verb, placement and orientation that takes a position, a direction, a scale or
rotation degrees takes them as one `Vector3` or as three numbers, and a viewport takes two `Vector2`
values or four numbers; the [Transform](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/transform.html) page shows the
pairs. A variable's `Set` takes one value, which `Vector3.From(x, y, z)` builds from three numbers. `Vector3.Zero`, `Vector3.One`, `Vector2.Zero`,
`Vector2.One` and `Rotation.Identity` are the constants.

Components and derived values read the same way on a literal and on an expression: `X`, `Y`, `Z`,
`Length`, `LengthSquared`, `Normalized`, `Dot(other)`, `DistanceTo(other)`, `WithX`, `WithY`, `WithZ`,
and `Vector3ValueBlock.Cross(left, right)`. A rotation offers `Inverse`, `ApplyTo(vec)`,
`AngleTo(other)` and `Compose(other)`.

A `Vector3` value's `X`, `Y` and `Z`, and a `Vector2` value's `X` and `Y`, are public fields, which
is what lets Unity save the value in an asset. C# can write one on a copy it holds, with the `f` a
`Single` takes:

```csharp
var offset = new Vector3(0, 1, 0);
offset.Y = 2.5f;
```

A variable has no writable component: `Probe.X = 1` does not compile, and
`Probe.Set(Probe.WithX(1))` replaces one component.

`Vector2` and `Vector3` are LunyScript's own types, `CodeSmile.LunyScript.Vector2` and
`CodeSmile.LunyScript.Vector3`, with the names Unity uses for its own. A script file imports no
`UnityEngine` namespace, so there the names mean LunyScript's types. A file that imports both
namespaces, such as a `MonoBehaviour` that reads a script, gets the compiler error CS0104 on the bare
name: write `UnityEngine.Vector3` there for Unity's type.

## Text

A text variable declared without a byte count grows with what you write into it. Each object keeps one
`System.String` for it, so a line of any length fits:

```csharp
Status = Define.Text(nameof(Status));
On.Update(Status.Set(Text.Format("{0} drones gathering, {1} returning", Gathering, Returning)));
```

Writing the characters the text already holds allocates nothing, so a status that is set every frame and
does not change costs nothing; writing different characters allocates the new string.

Name a byte count when the text has a known size and must never allocate. The text is then a fixed slot:
three of its bytes hold the length and a terminating zero, so `Bytes64` stores 61 usable bytes.

```csharp
Callsign = Define.Text(nameof(Callsign), TextCapacity.Bytes64);
```

| Capacity | Storage | Usable |
| --- | --- | --- |
| `TextCapacity.Bytes32` | 32 | 29 |
| `TextCapacity.Bytes64` | 64 | 61 |
| `TextCapacity.Bytes128` | 128 | 125 |
| `TextCapacity.Bytes512` | 512 | 509 |
| `TextCapacity.Bytes4096` | 4096 | 4093 |

Text longer than a fixed slot is refused when the block runs: the error names the slot, the bytes it was
given and the bytes it holds, the slot keeps what it had, and nothing is shortened. Byte counts are UTF-8,
so `€` takes three bytes and `😀` four.

`Text.Format` builds the content. `{0}` is the first argument, `{1}` the second, and `{0:2}` asks a
number hole for exactly two decimal places. A literal brace is written twice: `{{` or `}}`.

```csharp
Readout.Set(Text.Format(
    "{0:1} / {1} charge, lamp {2}", Charge, MaxCharge, Powered));
```

The format is parsed once, inside `Build()`. Writing the result into a fixed text every frame appends into a
buffer the size of the destination and allocates nothing; writing it into a growing text allocates only when
the result differs from what the text holds.

### Text from conditional parts

`Text.Join` writes a sentence whose parts each depend on a condition, in one block, where an `If`
chain would need one branch for every combination of the conditions:

<pre><code>RingVolley = Define.Flag(nameof(RingVolley), true);
MineLayer = Define.Flag(nameof(MineLayer), false);
Augments = Define.Text(nameof(Augments));

On.Update(Augments.Set(<strong>Text.Join(", ")
    .Part(</strong>RingVolley<strong>, "Ring volley")
    .Part(</strong>MineLayer<strong>, "Mine layer")
    .Else("none")</strong>));
</code></pre>

Each time the block runs, it tests every part's condition once, in the order you wrote them, and
writes the text of each part whose condition is true, with the separator between two written parts.
With both flags true, `Augments` holds `Ring volley, Mine layer`; with only `MineLayer` true,
`Mine layer`; with neither, the `Else` text, `none`. Without `Else`, the text is empty when no
condition is true. A part's condition is anything `If` takes.

A part's text is a literal, written as it is with any braces, a `Text.Format`, whose holes are read
when the part is written, or another `Text.Join`, written in that part's place:

<pre><code>Damage = Define.Number(nameof(Damage), 2);
Pierce = Define.Number(nameof(Pierce), 0);
Rolls = Define.Text(nameof(Rolls));

On.Update(Rolls.Set(<strong>Text.Join(", ")
    .Part(</strong>Damage &gt; 0<strong>, </strong>Text.Format("damage +{0:0}", Damage)<strong>)
    .Part(</strong>Pierce &gt; 0<strong>, </strong>Text.Format("pierce +{0:0}", Pierce)<strong>)
    .Else("no rolls")</strong>));
</code></pre>

A join goes wherever `Text.Format` goes: a text's `Set`, and a Label's `SetText` and `BindText` on
[User interface](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/user-interface.html). It needs at least one `Part`
before a `Set` takes it, and `Else` ends it. Start a join inside `Build()` and use it there: a join
stored and never used is refused when `Build()` ends, and one written as a statement is the compile
error LUNY004. Writing a join allocates exactly what writing a `Text.Format` into the same text
allocates.

| Write | What it adds |
| --- | --- |
| `Text.Join(separator).Part(condition, text)` | the first part; `text` is a literal or a format |
| `.Part(condition, text)` | another part, written after the ones before it |
| `.Else(text)` | the text written when no condition is true; ends the join |

To give a growing text an upper bound, add `Allocating`. A longer write is refused the way a fixed slot
refuses one:

```csharp
Log = Define.Text(nameof(Log)).Allocating(65536);
```

The bound is UTF-8 bytes, from 1 to 1048576. A growing text, bounded or not, is local to its peer. A
synchronised text is always fixed, 64 bytes unless you name another capacity, because its size is what it
costs on the wire; [Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html)
sends it.

`Assets/CodeSmile/LunyScript/ApiExamples/GrowingText.unity` binds one label to a growing text and one to a
64-byte text.

## Reacting to a change

```csharp
When.Var(Charge).Changed(Alarm.Set(true));
```

The watch is polled once per frame, after `On.Update`. A value that is written and written back
within the same frame raises nothing, because the poll sees the value it saw before.

## Call list

These lines are declaration signatures, not a script you can paste. Brackets mark a clause you may
leave out; braces mark a clause you must write, as one of the choices `|` separates. The working
declarations are above.

```csharp
Define.Number(name [ , defaultValue ])  [ .Shared() | .Shared(store) ]
Define.Flag(name [ , defaultValue ])    [ .Shared() | .Shared(store) ]
Define.Text(name)  [ .Allocating(maxBytes) | .Shared() | .Shared(store) ]     // grows
Define.Text(name, capacity)             [ .Shared() | .Shared(store) ]     // fixed
Define.Vector3(name [ , defaultValue ])    [ .Shared() | .Shared(store) ]
Define.Vector2(name [ , defaultValue ])
Define.Rotation(name [ , defaultValue ])
Define.Enum<T>(name, defaultValue)
Var.Define<T>(name [ , defaultValue ])
Var.DefineText(name)                    // grows
Var.DefineText(name, capacity)          // fixed
Var.DefineAllocatingText(name, maxBytes)
Bind.Number(name)                       { .Shared() | .Shared(store) }
Bind.Flag(name)                         { .Shared() | .Shared(store) }
Bind.Vector3(name)                         { .Shared() | .Shared(store) }
Bind.Text(name)                         { .Shared() | .Shared(store) }     // grows
Bind.Text(name, capacity)               { .Shared() | .Shared(store) }     // fixed
Define.Store()                          // store, for .Shared(store)
Shared.Clear([ store ])
```

`Var.Define*` declares the same things; `Var.Define<Number>` returns a handle that converts to `Number`,
and its operations are on `Number`: `Number health = Var.Define<Number>("health", 100);`.

## What to read next

- [Lists and maps](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/lists-and-maps.html) — many values under one name.
- [Random numbers](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/random-numbers.html) — draw a number into a
  `Number`.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — what to do
  with the conditions you just built.
- Generated reference:
  [`Number`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Number.html),
  [`Flag`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Flag.html),
  [`Var<T>`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Var-1.html),
  [`DefineFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.DefineFactory.html),
  [`BindFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.BindFactory.html),
  [`MathFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MathFactory.html),
  [`Vector3`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Vector3.html),
  [`Rotation`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Rotation.html),
  [`Text`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Text.html),
  [`TextCapacity`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.TextCapacity.html).
