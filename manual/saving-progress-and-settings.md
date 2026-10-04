# Saving progress and settings

Keep a variable between sessions by listing it in a document, then saving and
loading the document:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Scorer : Script
{
    public Document Career { get; private set; }
    public Operation LoadingCareer { get; private set; }
    public Operation SavingCareer { get; private set; }

    protected override void Build()
    {
        Best = Define.Number(nameof(Best), 0);
        Career = Define.Document(nameof(Career)).Field(nameof(Best), Best);
        LoadingCareer = Define.Operation(nameof(LoadingCareer));
        SavingCareer = Define.Operation(nameof(SavingCareer));

        On.Ready(Progress.Load(Career).As(LoadingCareer));
        When.Operation(LoadingCareer).Failed(Best.Set(0));
        When.Var(Best).Changed(Progress.Save(Career).As(SavingCareer));
    }
}
```

The first time the game runs there is nothing to load, so the load fails and
`Best` starts at 0. Every change to `Best` saves the document, and the next
session's load puts the saved value back.

A document is stored on the player's device, in a file of its own. `Progress`
keeps what a player earned: unlocks, counters, quest flags and records.
`Settings` keeps how a player configured the game: volume, sensitivity and
difficulty. Both belong to the local user, and both work without a network.

## Declaring a document

`Define.Document(name)` names the document, and each `Field(name, variable)`
lists one variable it keeps:

```csharp
Career = Define.Document(nameof(Career))
    .Field(nameof(Best), Best)
    .Field(nameof(Unlocked), Unlocked)
    .Field(nameof(Pilot), Pilot)
    .Field(nameof(Checkpoint), Checkpoint);
```

The first argument of `Field` is the name stored in the file. It is usually
`nameof` the variable; a fixed name keeps old saves loading after the variable
is renamed. A field holds a `Number`, a `Flag`, a text, a `Vector3`, a `Rotation`
or a `Vector2`, declared by the same script, object-local or shared.

Assign the document to a property you declare:
`public Document Career { get; private set; }`. Name it after what it holds: a
property named like a member every script has, such as `Run`, `Time` or
`Progress`, hides that member inside the script.

A Settings document can also keep a player's rebound controls. `Bindings`
lists them as one more field, stored under `Player0Bindings`:

```csharp
Preferences = Define.Document(nameof(Preferences))
    .Field(nameof(MusicVolume), MusicVolume)
    .Bindings(Input.ForPlayer(0));
```

[Player input](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/player-input.html) says what a
save and a load do with the controls.

Names use letters, digits, dash and underscore, 1 to 64 of them, and are case
sensitive: `Career` and `career` are two documents. `Build()` refuses a document with
no field, two fields of one name, one variable listed twice, a constant, a
synchronised variable, and a document name Windows reserves for a device such
as `NUL`.

## Saving and loading

| Call | What it does |
| --- | --- |
| `Progress.Save(doc).As(op)` | Stores every field's current value among the user's progress. |
| `Progress.Load(doc).As(op)` | Reads the stored copy and writes it into the fields. |
| `Settings.Save(doc).As(op)` | Stores the document among the user's settings. |
| `Settings.Load(doc).As(op)` | Reads it back from the settings. |

Every save and load is one attempt on an operation handle, so `.As(op)` is
required. The block returns at once; the file is written or read when the next
frame begins, and `When.Operation(op)` reports the outcome in that frame.
[Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html)
describes `Succeeded`, `Failed`, `Cancel()` and `Retry()`.

A save stores the values the fields held when its block ran. Two saves of one
document in the same frame write once, with the values of the later one. A
load that follows a save of the same document reads what the save wrote. One
document is either a `Progress` or a `Settings` document: naming it with both
is refused.

A failed attempt names why in `op.Failure`:

| Failure | Cause |
| --- | --- |
| `NotFound` | Nothing was saved yet. |
| `Unreadable` | The file is not a readable document, for example after a bad hand edit. |
| `Unsupported` | The file comes from a newer version of the script, or no migration step can bring it to this version. |
| `Unknown` | The device refused the read or the write, for example a full disk. |

A failed load writes nothing, and a failed save leaves the previous copy as
it was. `Unreadable` and `Unsupported` write a warning to the Console saying
what is wrong with the file.

## What a load writes

A load writes every field it can read together, then succeeds, so the blocks
of `When.Operation(op).Succeeded` already see the loaded values. A load
cancelled with `op.Cancel()`, or completing after its object despawned, writes
nothing.

A stored copy may lack a field, when the field was added after the file was
saved, or hold a value the field cannot take, such as a text longer than the
variable holds. The load then writes the other fields and still succeeds. The
fields it did not load keep their values:

```csharp
When.Operation(LoadingCareer).Succeeded(
    If(Career.Omitted(Pilot)).Then(Pilot.Set("Pilot")));
```

When a script reads neither `HasOmissions` nor `Omitted` for a document, a
load that omits fields writes one warning naming each of them.

## Knowing what is unsaved

| Condition | True when |
| --- | --- |
| `doc.IsDirty` | A field holds something other than what the last save wrote or the last load read, or the last load omitted a field. |
| `doc.Unsynced` | The document is stored on this device and not uploaded. `Cloud.Save` clears it; [Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html) says exactly when. |
| `doc.HasOmissions` | The last load omitted at least one field. |
| `doc.Omitted(field)` | The last load omitted that field. |

Before any save or load, `IsDirty` compares each field with the value it was
declared with. Changing a variable never saves by itself: the script saves when
it chooses to.

```csharp
On.Update(
    If(Career.IsDirty).Then(Hint.Set("Unsaved progress"))
        .Else(Hint.Set("")));
```

## Changing a document between versions

When a later version of your game renames or reshapes fields, raise the
document's version and register a migration step for each version before it:

```csharp
Career = Define.Document(nameof(Career)).Version(2)
    .Field(nameof(Best), Best)
    .Field(nameof(PlayMinutes), PlayMinutes)
    .Migration(new CareerVersion1To2());
```

A step is an ordinary C# class. It converts the fields of one version into the
next, on a copy of the stored fields:

```csharp
public sealed class CareerVersion1To2 : DocumentMigration
{
    public override int FromVersion => 1;

    public override MigrationResult Migrate(DocumentFields fields)
    {
        fields.Rename("best", "Best");
        if (fields.TryGetNumber("seconds", out var seconds))
        {
            fields.SetNumber("PlayMinutes", seconds / 60.0);
            fields.Remove("seconds");
        }

        return MigrationResult.Converted;
    }
}
```

`DocumentFields` reads with `TryGetNumber`, `TryGetFlag`, `TryGetText`,
`TryGetVector3`, `TryGetRotation` and `TryGetVector2`, writes with the matching `Set`
methods, adds a field only where it is missing with `DefaultNumber` and its
siblings, and has `Rename`, `Remove` and `Contains`. A step into a version that
adds `Bindings` calls `fields.DefaultBindings("Player0Bindings")`, which adds
the field with no controls, because a migrated document must hold every field. A step that returns
`MigrationResult.Rejected("why")`, or throws, fails the load as `Unsupported`.

Loading a version 1 file into a version 3 script runs the step from 1, then
the step from 2. After the steps, every declared field must be present and
readable, or the load fails as `Unsupported` and nothing is written. A load
never rewrites the file; the next save stores it at the new version. The steps
must follow on from one another: registering a step from version 1 and none
from version 2 of a version 3 document is refused when `Build()` runs.

## Where the files are

Each document is one file under `Application.persistentDataPath`:

```text
LunyScript/Users/Default/Progress/^Career.json
LunyScript/Users/Default/Settings/^Preferences.json
```

A `^` marks each capital letter, which keeps `Career` and `career` apart on file
systems that ignore case. The file is indented JSON, safe to read and to edit
by hand:

```json
{
  "format": 1,
  "version": 2,
  "fields": {
    "Best": 12,
    "Pilot": "Ada",
    "Checkpoint": [4, 0, 2.5]
  }
}
```

A player's controls are an object of control paths, one per rebound binding:

```json
"Player0Bindings": {
  "Player/Fire/0c8e0f5a-8f7d-4c1b-9d52-0e4b5f4d8a11": "<Mouse>/rightButton"
}
```

A save writes a temporary file and then replaces the document with it, so a
save that stops half way leaves the previous copy intact. A number that is not
finite is stored as the text `"NaN"`, `"Infinity"` or `"-Infinity"`.

## What is not included

- Choosing between several local users: every document belongs to the one
  default user.
- Fields of an enum, list or map type.
- Deleting a document from the device, and reading one from C#. `Cloud.Save`,
  `Cloud.Load` and `Cloud.Delete` keep a copy of the same document in the cloud;
  see [Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html).

## A worked example

```csharp
using CodeSmile.LunyScript;

public sealed partial class SoundMenu : Script
{
    public Document Sound { get; private set; }
    public Operation LoadingSound { get; private set; }
    public Operation SavingSound { get; private set; }

    protected override void Build()
    {
        Volume = Define.Number(nameof(Volume), 0.8);
        Muted = Define.Flag(nameof(Muted), false);
        Saved = Define.Flag(nameof(Saved), false);
        Sound = Define.Document(nameof(Sound))
            .Field(nameof(Volume), Volume)
            .Field(nameof(Muted), Muted);
        LoadingSound = Define.Operation(nameof(LoadingSound));
        SavingSound = Define.Operation(nameof(SavingSound));

        On.Ready(Settings.Load(Sound).As(LoadingSound));
        When.Operation(LoadingSound).Failed(Volume.Set(0.8));
        On.Update(
            If(Sound.IsDirty).Then(Saved.Set(false))
                .Else(Saved.Set(true)));
        CloseOptions = Define.Message();
        On.Message(CloseOptions,
            Settings.Save(Sound).As(SavingSound));
    }
}
```

The options menu loads the sound settings when it opens, shows whether they
changed since the last save, and saves them when the menu closes. The API
examples folder has a runnable scene, `Documents.unity`, that saves a career,
restores it after Restart, migrates an older version and reports an omitted
field.

## What to read next

- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html)
  — the operation handles every save and load reports through.
- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html)
  — the variables a document lists.
- Generated reference:
  [`Document`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Document.html),
  [`ProgressFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ProgressFactory.html),
  [`SettingsFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.SettingsFactory.html),
  [`DocumentMigration`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.DocumentMigration.html).
