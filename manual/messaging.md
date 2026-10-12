# Messaging

Declare a local message in `Build()`, handle it with `On.Message`, and send it from C#:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Battery : Script
{
    protected override void Build()
    {
        Health = Define.Number(nameof(Health), 40);
        Heal = Define.Message();
        On.Message(Heal, Health.Add(25));
    }
}
```

From C# on the same object, through the descriptor the generator writes for every declared
message:

```csharp
behaviour.Send(Battery.Messages.Heal);
```

The script decides what a heal does. C# does not write `Health` itself.

## Declaring a message

`Define.Message()` takes no name: the property the line is assigned to names the message, so a
misspelt message is a compile error. A local or a hand-written property names it with
`.As(name)`:

```csharp
Heal = Define.Message();
var ping = Define.Message().As("Ping");
```

## Receiving a message

`On.Message` takes the message and one or more blocks. A script handles only the messages it
declares.

```csharp
RequestReady = Define.Message();
On.Message(RequestReady, IsReady.Set(true));
```

Two `On.Message` calls naming the same message both fire, in the order they were written:

```csharp
On.Message(Heal, Health.Add(5));
On.Message(Heal, Heals.Add(1));
```

A send of `Heal` runs both handlers. A C# `Send` of a message this script has no handler for, or one another script
type declares, throws
`LunyScriptUsageException` naming the message and the reason.

## Sending from C#

`LunyScriptBehaviour.Send` runs this object's `On.Message` handlers for one declared message,
named through the generated `Messages` class of the script that declares it:

```csharp
if (behaviour.IsRunning)
    behaviour.Send(PlayerScript.Messages.Heal);
```

`IsRunning` is the check before `Awake`, after the object is despawned or destroyed, and after
Play Mode ends. A send in those states throws. See
[Reading scripts from C#](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html) for
finding another object's script.

Messages deliver only within one runner. LunyScript has no remote-message surface; LunyNet owns networking.

## What to read next

- [Reading scripts from C#](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html) —
  `Send` from a `MonoBehaviour`.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  lifecycle and tick events.
- Generated reference:
  [`OnFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OnFactory.html),
  [`LunyScriptBehaviour`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.LunyScriptBehaviour.html).
