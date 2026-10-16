# Cloud save

LunyCloud uploads and downloads LunyScript documents. LunyScript has no networking surface; LunyNet owns game networking.

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
RunEnded = Define.Message();
On.Message(RunEnded, Progress.Save(Career).As(Saving),
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
- A request reaches the backend at the start of the runner's next frame
  update, before any script's `On.Update` runs. A block in `On.Update`,
  `On.LateUpdate` or a watch therefore starts its request in the next frame;
  a block in `On.FixedUpdate` or a contact event, which Unity runs before
  `Update`, starts it in the same frame. The cloud client checks each request
  once per frame at that point, and `When.Cloud(op)` reports the outcome in the
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

### The backends

LunyCloud, the cloud module that ships with LunyScript, sends the requests.
With the Cloud Save package installed, cloud copies go to Unity Cloud Save:
the default runner is given LunyCloud's `UgsCloudBackend`, and
`UgsLeaderboardBackend` when the Leaderboards package is installed too, unless
**Unity Cloud Save** is turned off under Edit, Project Settings, LunyScript,
Supplied providers. The client signs in anonymously to Unity Gaming Services at
the first request and needs the project's Unity Cloud link.

A game that keeps its copies in a folder on the device, the path `folder` below,
names its own backend once, before the first request, and that replaces the
supplied ones:

```csharp
CloudGateway.Of(LunyScriptRuntime.DefaultRunner).UseBackend(new FileCloudBackend(folder));
```

`FileCloudBackend` keeps the account, the player's data and files, game data
and leaderboards in JSON files in the folder you name, which is how the API
example and the tests run without an account; `DelayCompletion(frames)` makes it
answer later, the way a network does, and `FailNext(failure)` fails the next
call with a chosen reason. `CloudGateway.Of(runner).UseServices(services)` names
other backends, one per service. The supplied backends can be replaced until
the first sign-in starts; backends a game names stay for the rest of the Play
session. An assembly definition whose scripts use `Cloud`, `Account` or
`Leaderboard` references `CodeSmile.Luny.Cloud.LunyScriptAdapter`, the assembly
that holds those calls.

### Accounts, keys, game data, files and leaderboards

The same module carries the rest of the cloud surface:

- `Account.SignIn().As(op)`, `Account.SignOut()`, `Account.Delete().As(op)` and
  the condition `Account.IsSignedIn()`, observed with `When.Account(op)`. After a
  sign-out, requests fail as `NotSignedIn` until the next `Account.SignIn()`.
- `Define.CloudKey(name)` names another key in the player's data:
  `Cloud.Save(doc).To(key)`, `Cloud.Load(key).Into(doc)` and `Cloud.Delete(key)`.
- `Define.GameData(collection, key)` names an item the game publishes, which a
  script reads with `Cloud.Load(item).Into(doc)` and cannot write.
- `Define.CloudFile(name)` names a file in the player's file storage; C# hands
  the bytes to a registered `ICloudFileSource`, and the script never holds them.
- `Define.Leaderboard(name)` with `Leaderboard.Submit(score).To(board).As(op)`,
  `Leaderboard.Load(board).Into(page)` and `Leaderboard.LoadEntry(board).Into(entry)`,
  observed with `When.Leaderboard(op)`. A score submitted offline waits in a
  queue on the device that a restart keeps, and `board.Waiting` counts it.

The agent skill at `Packages/com.codesmile.luny/CodeSmile/LunyCloud/AgentSkills/lunycloud/SKILL.md`
states every rule of these calls.

## A worked example

```csharp
using CodeSmile.LunyScript;

public sealed partial class CareerCloudScript : Script
{
    protected override void Build()
    {
        Best = Define.Number(nameof(Best), 0);
        Record = Define.Document(nameof(Record))
            .Field(nameof(Best), Best);
        Downloading = Define.Operation(nameof(Downloading));

        On.Ready(Cloud.Load(Record).As(Downloading));
        When.Cloud(Downloading).Succeeded(Status.Set("Loaded."));
        When.Cloud(Downloading).Failed(Status.Set("Kept on this device."));
    }
}
```

## What to read next

- [Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) — `On.Message` and sending from C#.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  lifecycle and tick events.
- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — local variable declarations and writes.
- Generated reference:
  [`CloudFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudFactory.html),
  [`CloudSaveBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudSaveBuilder.html),
  [`CloudLoadBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudLoadBuilder.html),
  [`CloudDeleteBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudDeleteBuilder.html),
  [`CloudGateway`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CloudGateway.html),
  [`FileCloudBackend`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.Luny.Cloud.FileCloudBackend.html).
