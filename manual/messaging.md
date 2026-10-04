# Messaging

Name a message in `Build()`, handle it with `On.Message`, and send it from C# or from a peer
without authority:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Battery : Script
{
    public const string Heal = nameof(Heal);

    protected override void Build()
    {
        Health = Define.Number(nameof(Health), 40);
        On.Message(Heal, Health.Add(25));
    }
}
```

From C# on the same object:

```csharp
behaviour.Send(Battery.Heal);
```

The script decides what a heal does. C# does not write `Health` itself.

## Receiving a message

`On.Message` takes the name and one or more blocks. Spell the name with `nameof` of a `const
string` so a rename moves the send and the handler together.

```csharp
On.Message(nameof(Heal), Health.Add(25));
On.Message("RequestReady", IsReady.Set(true));
```

Two `On.Message` calls naming the same message both fire, in the order they were written:

```csharp
On.Message(Heal, Health.Add(5));
On.Message(Heal, Heals.Add(1));
```

A send of `Heal` runs both handlers. A send with no matching `On.Message` in the same script is
refused while `Build()` runs when the send is authored in that script. A C# `Send` of a name this
script has no handler for throws `LunyScriptUsageException` naming the message and the script.

## Sending from C#

`LunyScriptBehaviour.Send` runs this object's `On.Message` handlers:

```csharp
var script = (PlayerScript)behaviour.Script;
if (behaviour.IsRunning)
    behaviour.Send(PlayerScript.Heal);
```

`IsRunning` is the check before `Awake`, after the object is despawned or destroyed, and after
Play Mode ends. A send in those states throws. See
[Reading scripts from C#](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html) for
finding another object's script.

## Sending from a peer

A peer without authority asks the authority to act with `Net.Send.ToAuthority`. The authority
receives that send with `On.Message` in the same script:

```csharp
On.Update(
    If(!Net.HasAuthority & IsReady.IsFalse())
        .Then(Net.Send.ToAuthority("RequestReady")));

On.Message("RequestReady", IsReady.Set(true));
```

[Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html) is the
session, cadence and authority surface. `On.Authority.Gained` and `On.Authority.Lost` live there.

## What to read next

- [Reading scripts from C#](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/reading-scripts-from-csharp.html) —
  `Send` from a `MonoBehaviour`.
- [Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html) —
  `Net.Send.ToAuthority` and authority events.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  lifecycle and tick events.
- Generated reference:
  [`OnFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OnFactory.html),
  [`LunyScriptBehaviour`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.LunyScriptBehaviour.html),
  [`NetSendFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.NetSendFactory.html).
