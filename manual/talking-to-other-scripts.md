# Talking to other scripts

Read another object's script with its generated reader, and ask it to change itself with a
request it declares:

```csharp
using CodeSmile.LunyScript;

public sealed partial class EnemyScript : Script
{
    protected override void Build()
    {
        Health = Define.Number(nameof(Health), 40);
        Heal = Define.Request();
        On.Request(Heal, If(Health >= 100).Then(Reject()));
        On.Request(Heal, Health.Add(25));
    }
}

public sealed partial class HealerScript : Script
{
    protected override void Build()
    {
        Patient = Bind.Object();
        Seen = Define.Number(nameof(Seen), 0);
        var patient = EnemyScript.At(Patient);
        On.Update(Seen.Set(patient.Health));
        On.Ready(Request(Patient, EnemyScript.Requests.Heal));
    }
}
```

`EnemyScript.At(Patient)` reads the `EnemyScript` running on the object the `Patient` binding
names. `patient.Health` has no `Set` and no `Add`: only the enemy's own script changes its
`Health`, and the healer asks for that with the enemy's `Heal` request. The enemy decides, and at
full health it refuses.

## Reading another script

The variable generator writes a static `At(target)` into every partial script class that has a
public variable. It returns a reader whose properties are that script's public variables, each a
read of the variable's kind, plus `IsRunning`:

```csharp
var enemy = EnemyScript.At(Patient);
On.Update(
    Seen.Set(enemy.Health),
    If(enemy.IsRunning & enemy.Alive).Then(Object.SetColor(enemy.Tint)));
```

- **A target** is a binding `Bind.Object()` declared, an object this script holds under a name,
  `Object.Owned("Companion")`, or inside a request handler, `Sender`.
- **Every readable kind reads**: Number, Flag, `Vector3`, `Vector2`, `Rotation`, `Color` and a
  declared enum. A private variable, and a Text variable, is not on the reader.
- **A read runs when its block runs**, so it returns the value the target holds at that moment.
  A reader of a script also reads a script derived from it.
- **While the target names no running script of the type**, a read returns its kind's default:
  0, False, a zero vector, the identity rotation, a clear colour, the enum's first value.
  `IsRunning` is False then. An empty binding and an ended target write nothing to the Console. A
  target that runs a script of another type writes one warning per `At(target)`, because that is
  a mistake in the scene.
- **A read never reaches another incarnation.** When the target's object is despawned and reused
  from a pool, an owned name that held it is empty again; the new use is read only through a name
  that holds it now.

A read is for blocks. C# reads another object's script with `LunyScript.Find`, which throws after
the script ended instead of returning a default; see
[Reading scripts from C#](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html).

## Watching another script's variable

`When.Var` takes a Number, Flag or enum read and runs its blocks when the value changes:

```csharp
var enemy = EnemyScript.At(Object.Owned("Target"));
When.Var(enemy.Health).Changed(Flash.Set(true));
```

The watch follows the target. When the target resolves to another incarnation than before, the
watch takes that incarnation's value as its new start and runs nothing, whether the two values
are equal or not. While the target names nothing, it runs nothing. The watch ends with the
script that declared it.

## Asking another script: requests

A script declares the requests it accepts and handles each one:

```csharp
Heal = Define.Request();
On.Request(Heal, If(Health >= 100).Then(Reject()));
On.Request(Heal, Health.Add(HealerScript.At(Sender).Strength));
```

Another script sends one through the declaring script's generated `Requests` class:

```csharp
Healing = Define.Operation(nameof(Healing));
On.Ready(Request(Patient, EnemyScript.Requests.Heal).As(Healing));
When.Operation(Healing).Failed(Seen.Set(-1));
```

- **The receiver decides.** Its `On.Request` sections run in the order written, and
  `Reject()` refuses the request: the sections after the current one do not run, and what
  already ran stays done.
- **Delivery is immediate.** The sections run inside the sender's block, before its next block,
  also while the receiver's game is paused. `Sender` inside them is the sending script.
- **A handler may send more requests and events.** Requests and events nest at most 8 deep; one
  past that is refused, and the sender's later blocks still run.
- **`.As(operation)` observes the outcome:**

| Outcome | When |
| --- | --- |
| Succeeded | every section ran |
| Failed as `Denied` | a section ran `Reject()`, the receiver is deactivated or stopped, or the nesting limit refused it |
| Failed as `NotFound` | the target names no running script that handles this request |
| Failed as `Unknown` | a block of a section threw; the receiver stops, the sender does not |

Without `.As`, a request nothing handled is reported once as a warning, and a refusal is silent.

A script handles only the requests it declares, so `On.Request(EnemyScript.Requests.Heal, ...)`
in another script is refused when the script is built. `Requests` lists the requests a
`Define.Request()` line declares; one a hand-written property holds, named with
`.As(nameof(...))`, is used by its own script only.

## Telling every script: events

A script declares the events it sends and sends only its own:

```csharp
Opened = Define.Event();
On.Request(Open, IsOpen.Set(true), SendEvent(Opened));
```

Any script listens through the declaring script's generated `Events` class:

```csharp
On.Event(DoorScript.Events.Opened).Do(DoorsOpened.Add(1));
On.Event(DoorScript.Events.Opened).From(FrontDoor).Do(FrontOpen.Set(true));
```

Without `From`, a listener hears every running `DoorScript` that sends `Opened`, its own object
included. `.From(target)` hears only the script its target names when the event arrives. An
unrelated script's own `Opened` is another event. Listeners run immediately, in the order they
were spawned; a deactivated or ended listener hears nothing. An event carries no values: a
listener reads the sender through a target it holds.

## Sharing a gate

A gate a script declares is one another script opens or closes through the declaring script's
`Gates` class:

```csharp
// In LoaderScript:
Loading = Define.Gate();
On.Ready(Gate.Open(Loading, GateCategory.Input));

// In any other script:
On.Update(If(Done).Then(Gate.Close(LoaderScript.Gates.Loading)));
```

Two scripts that each declare their own `Loading` hold two gates, and `Gate.Open("Loading", ...)`
with a string is a third. Every other rule of gates applies; see
[Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html).

## Scripts that run once per game

A script declares that it runs once per game in its `Options` property:

```csharp
public sealed partial class QuestDirector : Script
{
    protected override LunyScriptOptions Options => RunAs(Scope.Singleton);

    protected override void Build()
    {
        Completed = Define.Number(nameof(Completed), 0);
        On.Event(QuestGiver.Events.Finished).Do(Completed.Add(1));
    }
}
```

- **No scene holds it.** When the game starts, LunyScript creates one GameObject named after the
  script, with a Transform and a `LunyScript Behaviour`, moves it to DontDestroyOnLoad, and runs
  the script there until the game ends. Scene loads do not end it.
- **Every singleton exists before any of them runs `On.Ready`**, so each hears the events the
  others send from `On.Ready`. Which `On.Ready` runs first is not promised.
- **Its inputs are its declarations' defaults.** The object has no Inspector rows, and an object
  binding searches only DontDestroyOnLoad.
- **A copy on another object does not run.** A `LunyScript Behaviour` running a singleton script
  in a scene or a prefab writes one warning and does nothing.
- **`RunAs` belongs in `Options`.** Called inside `Build()` it is refused, because the scope is read
  before `Build()` runs. A variable or document named `Options` hides this property; name it after
  what it holds, such as `Preferences`.
- **Samples and tests do not start.** An assembly marked
  `[assembly: LunyScriptAssembly(AssemblyUsage.Sample)]` or `AssemblyUsage.Test`, and an assembly
  that references NUnit, is left out of the game start.

Scripts reach a singleton through its events and gates. A reader and a request need a target, and
a singleton has no binding another script can name.

## What is not included

- Reading or asking the collider on the far side of a contact: `Other` names a collider, not a
  script.
- Values carried by a request or an event.
- Finding a script by its type or a singleton by its name.
- Requests and events between peers; those use
  [Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) and `Net.Send`.

## What to read next

- [Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html) — the targets
  a reader and a request take.
- [Object pools](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/object-pools.html) — the owned names
  `Object.Owned(name)` reads.
- [Reading scripts from C#](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html) — the
  C# view of another object's script.
- Generated reference:
  [`LunyScriptTarget`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.LunyScriptTarget.html),
  [`Request`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Request.html),
  [`Event`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Event.html),
  [`LunyScriptOptions`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.LunyScriptOptions.html).
