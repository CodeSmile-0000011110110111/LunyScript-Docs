# Custom data and files

Declare a struct of your own game data and give each object its own copy:

```csharp
using CodeSmile.LunyScript;

[LunyScriptData]
public partial struct WeaponStats
{
    public double Damage;
    public double Cooldown;
}

public sealed partial class Weapon : Script
{
    protected override void Build()
    {
        Stats = Define.Data(new WeaponStats { Damage = 10, Cooldown = 0.4 });
        On.Ready(Stats.Damage.Add(5));
    }
}
```

`[LunyScriptData]` makes `WeaponStats` a data schema. Each field of `Stats` is a variable of the
object the script runs on: `Stats.Damage` is a `Number` named `Stats.Damage`, and every block and
comparison that takes a `Number` takes it. Every object starts from 10 and 0.4, and changing one
object's copy changes no other object's.

## What a schema holds

A schema is a `partial struct`. Its public fields, in the order you declare them, are:

- numbers of any C# number type except `decimal`, each a `Number`;
- `bool`, a `Flag`;
- a C# `enum`, a variable of that enum;
- LunyScript's `Vector3`, `Vector2` and `Rotation`;
- LunyScript's `Color`, a colour variable;
- `string`, a `Text` of 64 bytes, or of the capacity
  `[LunyScriptDataField(Capacity = TextCapacity.Bytes128)]` names;
- another `[LunyScriptData]` struct, whose fields are named such as `Stats.Muzzle.Speed`.

Any other field is reported by the compiler as LUNY001. The script and the schema name no engine
type, so both compile in an assembly definition with No Engine References checked.

## Data from an asset

A `ScriptableObject` can hold the data. Mark the fields a script may read:

```csharp
using System;
using CodeSmile.LunyScript;
using UnityEngine;

[Serializable, LunyScriptData]
public partial struct WeaponBalance
{
    public double Damage;
    public double Cooldown;
}

public partial class WeaponAsset : ScriptableObject
{
    [LunyScriptDataField] public int SomeValue = 7;
    [LunyScriptDataField] public WeaponBalance Balance;
}
```

The class is `partial` because LunyScript writes the code that reads those fields; no field is read
by reflection. `[Serializable]` is what lets Unity save the struct in the asset. A `Vector3` or
`Vector2` field of the struct is saved with it: the Inspector shows its `X`, `Y` and `Z`, and the
script copies the saved values. A script declares two inputs that read the asset:

```csharp
Balance = Bind.Data(WeaponBalance.Schema);
Power = Bind.Number().FromDataField("SomeValue");
On.Ready(Power.Add(5));
```

The `LunyScript Behaviour` shows a field for each, and you assign the asset to both. When an object
spawns, before `On.Ready`, `Balance` copies the asset's one `WeaponBalance` field and `Power` copies
`SomeValue` into that object's own variables. After `On.Ready` this object's `Power` is 12, and the
asset still holds 7; the next object starts from 7 again, and a pooled object copies the asset again
each time it is reused.

An object whose field is empty does not start: rules data has no placeholder. The spawn is refused,
with an error naming the input, when nothing is assigned, when the asset has no annotated field of
that name or that schema, when the named field holds no number, or when the asset has two fields of
the schema.

## One copy for every script

When many scripts read the same tuning, share one copy of it instead of copying each field into a
`.Shared()` number. `LootStats` here is a `[LunyScriptData]` struct with a `GoldWeight` number and a
`DropsGuns` flag, which an asset holds the way `WeaponAsset` holds `WeaponBalance` above. Every
script that reads it declares the same line under the same name:

<pre><code>LootTuning = <strong>Bind.Data(LootStats.Schema).Shared()</strong>;
Gold = Define.Number(nameof(Gold), 0);
On.Ready(If(<strong>LootTuning.DropsGuns</strong>.IsTrue())
    .Then(Gold.Set(<strong>LootTuning.GoldWeight</strong>)));
</code></pre>

Assign the asset on one object, such as the session that runs the round, and leave the `LootTuning`
field empty on the others, such as the loot prefab. The first object that spawns with an asset
assigned copies it into the shared copy, before its `On.Ready`. `LootTuning.GoldWeight` is then one
value every script reads and writes, as a `.Shared()` number is, and the asset keeps its values.
Every object of a loaded scene spawns before any of them runs `On.Ready`, so they all read the
asset's values there, whichever spawned first. An object that spawns before any object with an
asset reads zero, false and empty text until one does.

Every asset assigned to the copy holds the same values. An object whose asset holds other values
does not start, and the error names the field and both values. The same asset, or another one with
equal values, writes nothing, so a value a block changed stays changed. `Shared.Clear()` puts the
copy back to the asset's values, and `.Shared(RunState)` places the copy on a store
`Define.Store()` declared, as it does for a shared number.

A shared copy holds numbers, `bool`, `string` and `Vector3` fields, and nested structs of those. A
schema with another field type, such as a `Color`, is refused when the script type is built; give
each object its own copy of it with `Bind.Data(schema)`.

## Files

A file is read when the load that names it runs, and never before:

```csharp
Notice = Define.Text(nameof(Notice), TextCapacity.Bytes4096);
NoticeFile = Bind.TextFile().FromUserData("notice.txt");
Reading = Define.Operation(nameof(Reading));
On.Ready(Asset.Load(NoticeFile).Into(Notice).As(Reading));
When.Operation(Reading).Failed(Notice.Set("No notice today."));
```

| Source | The folder it reads |
| --- | --- |
| `FromStreamingAssets(path)` | `Assets/StreamingAssets`, which Unity copies into the build |
| `FromUserData(path)` | `Application.persistentDataPath`, which survives between runs |
| `FromTemp(path)` | `Application.temporaryCachePath`, which the platform may clear |

The path is relative to its folder, uses `/` between folder names, and may not leave the folder.
`When.Operation` reports the load: Succeeded once the destination was written, Failed with
`NotFound` for a missing file and with `Denied` for content that is not valid or does not fit.

A text file is UTF-8, with or without a byte-order mark. Text longer than the destination holds,
or bytes that are not UTF-8, fail the load and leave the text as it was.

### JSON into data

A JSON file fills a `Define.Data` of the same schema:

```csharp
Stats = Define.Data(new WeaponStats { Damage = 10, Cooldown = 0.4 });
StatsFile = Bind.Data(WeaponStats.Schema)
    .FromStreamingAssets("weapon.json");
LoadingStats = Define.Operation(nameof(LoadingStats));
On.Ready(Asset.Load(StatsFile).Into(Stats).As(LoadingStats));
```

With `weapon.json` holding `{"Damage": 12, "Unused": 99}`, `Stats.Damage` becomes 12 and
`Stats.Cooldown` stays 0.4. Every load starts from the values `Define.Data` declared, replaces the
fields the file names, and ignores members the schema does not have, so loading `{}` restores all
of the declared values. A field name in the file matches its C# name exactly, including case. A
number goes into a number field, `true` or `false` into a `bool`, text into a `string`, the number of
a declared constant into an enum, an array of 3, 2 or 4 numbers into a `Vector3`, `Vector2` or
`Rotation`, and an object into a nested schema. A value of the wrong kind, a fraction in an integer
field, or text longer than its field fails the whole load, and no field changes. A colour field has
no JSON layout yet: a file that names one fails the load, and a file that leaves it out keeps the
declared colour.

### Pictures and sounds

A `Texture2D` input decodes a PNG file, and an `AudioClip` input a WAV file of PCM samples:

```csharp
Chime = Bind.AudioClip().FromStreamingAssets("chime.wav");
LoadingChime = Define.Operation<AudioClip>(nameof(LoadingChime));
On.Ready(Asset.Load(Chime).As(LoadingChime));
When.Operation(LoadingChime).Succeeded(Audio.PlayOneShot(Chime));
```

A clip or texture assigned in the Inspector is used instead of the file. Until the load succeeds,
an input with nothing assigned holds its placeholder, a short low tone or a checkered texture. The
decoded clip belongs to the object and is destroyed when the object ends.

### A colour saved in an asset

LunyScript's `Color` keeps its four channels in public fields, so Unity saves a `Color` field of a
schema with the asset, and the Inspector shows it as four numbers from 0 to 1:

```csharp
using System;
using CodeSmile.LunyScript;

[Serializable, LunyScriptData]
public partial struct TeamLook
{
    public Color Tint;
    public Color Flash;
}
```

```csharp
using CodeSmile.LunyScript;
using UnityEngine;

public partial class TeamAsset : ScriptableObject
{
    [LunyScriptDataField] public TeamLook Look;
}
```

The schema's file imports no engine namespace, so `Color` there is LunyScript's. A file that
imports both `CodeSmile.LunyScript` and `UnityEngine` writes `UnityEngine.Color` for Unity's type.
`Team = Bind.Data(TeamLook.Schema)` copies the asset's two colours into colour variables when the
object spawns, and `Object.SetColor(Team.Tint)`, on the
[Showing, hiding and tinting](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/showing-hiding-and-tinting.html) page,
writes one into the object's renderer.

## Limits

- A `Rotation` field of a schema stored in an asset keeps its default value, because Unity does
  not save that type's components. Store such values as number fields. A `Vector3`, `Vector2` or
  `Color` field is saved.
- A text or JSON load reads a file; it cannot read a `TextAsset` assigned in the Inspector.
- A shared copy is filled once per Play session and has no JSON form. A later scene that assigns an
  asset with other values to the same copy does not start those objects.

The `DataInputs` scene in `ApiExamples` shows every call on this page, and the `Colors` scene shows
a colour saved in a team asset.

Next: [Saving progress and settings](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/saving-progress-and-settings.html),
or the [API Reference](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/).
