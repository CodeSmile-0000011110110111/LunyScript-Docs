# Networking and cloud save

Synchronise a variable by naming how often it should be sent:

```csharp
using CodeSmile.LunyScript;

public sealed class Scorer : Script
{
    public Number Score { get; private set; }

    protected override void Build()
    {
        Score = Var.DefineSynced<Number>(
            nameof(Score), SyncCadence.OnChange, 0);

        On.Update(If(Net.HasAuthority).Then(Score.Add(Time.Delta)));
    }
}
```

The authority counts, and every peer reads the same `Score`. `Score` is written and read with the
same calls as any other variable.

## How synchronisation is expressed

Each channel and each variable names its own cadence. There is one call per channel rather than one
switch that sends everything, so a scale that never changes stays off the wire while a position that
changes every tick is sent every tick.

| Cadence | When the value is sent |
| --- | --- |
| `SyncCadence.Once` | One time, the first time the value is known. |
| `SyncCadence.OnChange` | Whenever the value changes. |
| `SyncCadence.EveryTick` | On every network tick. |
| `SyncCadence.OnChangeCapped(maxPerSecond)` | On change, at most that many times per second. |

```csharp
Sync.Position(SyncCadence.EveryTick);
Sync.Rotation(SyncCadence.OnChange);
Sync.Scale(SyncCadence.Once);

Score = Var.DefineSynced<Number>(nameof(Score), SyncCadence.OnChange, 0);
IsReady = Var.DefineSynced<Flag>(
    nameof(IsReady), SyncCadence.OnChange, false);
Health = Var.DefineSynced<Number>(
    nameof(Health), SyncCadence.OnChangeCapped(10), 100);
PlayerName = Var.DefineSyncedText(nameof(PlayerName), SyncCadence.Once);
```

The cadence is required, so no channel is synchronised at a cost nobody chose. Declaring one channel
twice in a script is refused, and so is leaving the cadence out.

`Var.DefineSynced<T>` takes `Number` or `Flag`; text uses `Var.DefineSyncedText`. The cadence comes
before the capacity, because C# allows no required parameter after an optional one. Text carries a
managed string on the wire, so `EveryTick` is refused for it and `Once` is the usual choice.

Position is sent as the change since the last one, in 6 bytes, and in full in 12 bytes when the change
is too large to encode that way or a peer has just joined. Rotation is a quaternion compressed into 4
bytes. What the channels carry crosses as one stream per authority per network tick.

Only the authority may move an object whose position is synchronised. A move on another peer is
refused, and the diagnostic message names what to write instead.

## Reading the session

```csharp
If(Net.HasAuthority).Then(Driving.Set(true));
If(Net.IsConnected).Then(Online.Set(true));
If(Net.IsHost).Then(Hosting.Set(true));

Peers.Set(Net.PeerCount);
Latency.Set(Net.RoundTripMilliseconds);
```

`Net.HasAuthority` is whether this peer owns this object, `Net.IsConnected` whether it is in a
session at all, and `Net.IsHost` whether it is the host.

## Noticing a stale replica

`Net.SecondsSinceUpdate` is how long since this peer last received a value, which is how a script
notices that its copy has stopped arriving:

```csharp
On.Update(
    If(Net.SecondsSinceUpdate(Score) > 2)
        .Then(Stale.Set(true))
        .Else(Stale.Set(false)));
```

It takes either a variable declared with `DefineSynced`, or a transform channel.

## Messages

A peer without authority asks the authority to act by sending a named message. The authority
receives it with `On.Message` in the same script:

```csharp
On.Update(
    If(!Net.HasAuthority & IsReady.IsFalse())
        .Then(Net.Send.ToAuthority("RequestReady")));

On.Message("RequestReady", IsReady.Set(true));
```

[Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) is the `On.Message` surface, including
two handlers for one name and sending from C#.

## Authority changing hands

```csharp
On.Authority.Gained(Driving.Set(true));
On.Authority.Lost(Driving.Set(false));
```

An object spawned with authority raises `Gained` on the first networked tick. `Lost` also runs when
the session ends.

## Cloud save

`Cloud` uploads a document to the signed-in player's Cloud Save data, downloads
it back, and deletes the cloud copy. The document is the one
[Saving progress and settings](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/saving-progress-and-settings.html)
declares with `Define.Document`, so one declaration serves the copy on the
device and the copy in the cloud:

```csharp
Career = Define.Document(nameof(Career))
    .Field(nameof(Best), Best)
    .Field(nameof(Pilot), Pilot);

On.Ready(Cloud.Load(Career).As(Downloading));
On.Message("RunEnded", Progress.Save(Career).As(Saving),
    Cloud.Save(Career).As(Uploading));
When.Cloud(Uploading).Failed(Status.Set("Kept on this device"));
```

| Start | What it does |
| --- | --- |
| `Cloud.Save(doc).As(op)` | Uploads every field's value when the block runs, as one stored value. |
| `Cloud.Load(doc).As(op)` | Downloads the copy and writes its fields together. |
| `Cloud.Delete(doc).As(op)` | Removes the cloud copy; the fields are not touched. |

Every start needs `.As(handle)`, a handle `Define.Operation` declared.
`When.Cloud(handle)` is the same watch as `When.Operation(handle)`, so
`Succeeded`, `Failed`, `Canceled`, `Finished` and the handle's conditions work
the way [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html)
describes.

- The cloud copy is stored under the document's name, in the layout the copy on
  the device has. A download migrates an older version and reports omitted
  fields the way `Progress.Load` does.
- A document never uploaded fails a download as `NotFound`, and every field
  keeps its value. A delete succeeds whether or not a copy existed.
- A request reaches the provider at the start of the runner's next frame
  update, before any script's `On.Update` runs. A block in `On.Update`,
  `On.LateUpdate` or a watch therefore starts its request in the next frame;
  a block in `On.FixedUpdate` or a contact event, which Unity runs before
  `Update`, starts it in the same frame. The gateway checks each request once
  per frame at that point, and `When.Cloud(op)` reports the outcome in the
  frame it finds it.
- Requests for one document run one at a time, in the order their blocks ran.
  A download after an upload reads what the upload stored. When a request
  fails, the next one still runs with the values it captured; the failed one is
  not sent again.
- Cancelling a request that has not been sent yet removes it.
- LunyScript sets no time limit on a cloud request. The service decides when a
  request has timed out and reports `Timeout`.

### Unsynced

`doc.Unsynced` is true when the document was edited since the cloud last
confirmed an upload, or when the copy on the device is newer than that upload.
A download never makes it false. An upload that the cloud confirms makes it
false only when no field changed after the upload captured its values, even if
a value changed and then returned to what was uploaded:

```csharp
On.Update(If(Career.Unsynced).Then(Status.Set("Not uploaded yet")));
```

`doc.IsDirty` keeps describing the copy on the device: an upload does not change
it, and a download changes it only through the values it writes.

### The provider

The game names where cloud copies go once, before or after the first request:

```csharp
var cloud = LunyScriptRuntime.DefaultRunner.CloudGateway;
cloud.UseProvider(new CodeSmile.LunyScript.Services.UgsCloudSaveProvider());
```

`UgsCloudSaveProvider` signs in anonymously to Unity Gaming Services and needs
the project's Unity Cloud link. `FileCloudSaveProvider` keeps each document as a
file in a directory you name, which is how the API example and the tests run
without an account; `DelayCompletion(frames)` makes it answer later, the way a
network does.

## A worked example

```csharp
using CodeSmile.LunyScript;

public sealed partial class NetworkedRunner : Script
{
    public Number Score { get; private set; }
    public Document Record { get; private set; }
    public Operation Downloading { get; private set; }
    [Variable] public Flag Stale { get; private set; }

    protected override void Build()
    {
        Score = Var.DefineSynced<Number>(
            nameof(Score), SyncCadence.OnChange, 0);
        Best = Define.Number(nameof(Best), 0);
        Record = Define.Document(nameof(Record))
            .Field(nameof(Best), Best);
        Downloading = Define.Operation(nameof(Downloading));
        Sync.Position(SyncCadence.EveryTick);
        Sync.Rotation(SyncCadence.OnChange);

        On.Ready(Cloud.Load(Record).As(Downloading));

        On.Update(
            If(Net.HasAuthority).Then(Score.Add(Time.Delta)),
            If(Net.SecondsSinceUpdate(Score) > 2)
                .Then(Stale.Set(true))
                .Else(Stale.Set(false)));

        When.Cloud(Downloading).Succeeded(Stale.Set(false));
    }
}
```

A document field cannot be a synchronised variable, because a download writes
the field on every peer; the example keeps the best score in its own `Best`.

## What to read next

- [Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) — `On.Message` and sending from C#.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  lifecycle and tick events.
- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — how a
  synchronised variable is read and written.
- Generated reference:
  [`OnAuthorityFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OnAuthorityFactory.html),
  [`NetFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.NetFactory.html),
  [`NetSendFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.NetSendFactory.html),
  [`SyncFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.SyncFactory.html),
  [`SyncCadence`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.SyncCadence.html),
  [`CloudFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudFactory.html),
  [`CloudSaveBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudSaveBuilder.html),
  [`CloudLoadBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudLoadBuilder.html),
  [`CloudDeleteBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudDeleteBuilder.html),
  [`FileCloudSaveProvider`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.FileCloudSaveProvider.html).
