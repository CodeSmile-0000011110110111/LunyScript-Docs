# Assets and operations

Declare the asset a script needs and use it:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Turret : Script
{
    [Asset] public Prefab Shell { get; private set; }

    protected override void Build()
    {
        Fire = Define.Message();
        On.Message(Fire, Object.Create(Shell).At(new Vector3(0, 1, 0)));
    }
}
```

Add the component, drag a prefab onto the `Shell` field it shows in the Inspector, and the turret
spawns that prefab whenever it receives the message.

## Declared inputs

An asset a script uses is a declared input. The script names what it needs, and the object assigns
it. Nothing is looked up by path while the game runs.

```csharp
protected override void Build()
{
    Shell = Bind.Prefab();
    Poster = Bind.Texture2D();
    Stripe = Bind.Texture2D().FromResources("Posters/Stripe");
    Shot = Bind.AudioClip();
    Master = Bind.AudioMixer();
    Effects = Bind.AudioMixerGroup();
    Hud = Bind.VisualTreeAsset();
}
```

A partial script needs no property for these lines: the generator writes `Shell`, `Poster` and the
others, and gives each input its property's name. `FromResources(key)` names a Resources-relative,
extension-free key that is used when the object assigns nothing. A `Texture2D` or `AudioClip` input
can name a PNG or WAV file instead, which `Asset.Load` reads; see
[Custom data and files](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/custom-data-and-files.html).

The input types, such as `Texture2D` and `AudioClip`, are LunyScript's own types with Unity's names.
A script imports only `CodeSmile.LunyScript`, so it names no engine type, and it compiles in an
assembly definition with No Engine References checked. `Prefab` is the type `Object.Create` and
`Define.Pool` take, `AudioClip` the type `Audio.PlayOneShot` takes, and `VisualTreeAsset` the type
`Panel.Place` takes. An object in the scene is bound with `Bind.Object()`; see
[Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html).

`[Asset]` on a public auto-property declares the same input:

```csharp
[Asset] public Prefab Shell { get; private set; }

[Asset(Resources = "Posters/Stripe")]
public Texture2D Stripe { get; private set; }
```

A local or a hand-written property has no generated property to name it, so its line names the
input with `As`:

```csharp
var banner = Bind.Texture2D().As("Banner");
```

An object assigns its inputs on the `LunyScript Behaviour` component, one field per declared input,
below the script. An input the object leaves empty resolves to that input's own declared source, and
then to the registered placeholder for its type, and the resolution is reported. A `GameObject` that
the object assigned but that is not a prefab asset is refused at spawn, because `Object.Create` takes
`Prefab`. C# on the object reads an input with `behaviour.GetAsset(script.Poster)`, which returns the
Unity asset.

## Operations: work that takes more than one frame

A load, an interactive rebind and a cloud round trip each take more than a frame and end in one
classified outcome. An operation handle is how a script observes one.

```csharp
Operation<Prefab> Loading;

protected override void Build()
{
    Loading = Define.Operation<Prefab>(nameof(Loading));

    On.Ready(Asset.Load(Guard).As(Loading));

    When.Operation(Loading).Succeeded(Object.Create(Loading), Ready.Set(true));
    When.Operation(Loading).Failed(Ready.Set(false));
    When.Operation(Loading).Finished(Asset.Release(Loading));
}
```

`Define.Operation(name)` declares a handle that carries no payload, and
`Define.Operation<T>(name)` declares one that carries a `T` when it succeeds. The name is what a
diagnostic message calls the attempt. An attempt that is still pending after 30 unscaled seconds
times out.

## Watching an outcome

| Watch | When it runs |
| --- | --- |
| `When.Operation(handle).Succeeded(block, ..)` | The attempt met its objective. |
| `When.Operation(handle).Failed(block, ..)` | The attempt reached a terminal state without meeting it. |
| `When.Operation(handle).Canceled(block, ..)` | The attempt was cancelled. |
| `When.Operation(handle).Finished(block, ..)` | Any of the three above. |

```csharp
When.Operation(Loading).Succeeded(Ready.Set(true));
When.Operation(Loading).Failed(LastFailure.Set(Loading.Failure));
When.Operation(Loading).Canceled(Prompt.Set("Canceled."));
When.Operation(Loading).Finished(Asset.Release(Loading));
```

Cancellation runs the `Canceled` watch and leaves the `Failed` watch alone; the two are separate
outcomes. A classified failure that no watch observes is logged once per attempt.

## Reading an outcome as a condition

The same four states read as conditions, which is what you use inside a tick event:

```csharp
On.Update(
    If(Loading.IsPending).Then(State.Set(1)),
    If(Loading.Succeeded).Then(State.Set(2)),
    If(Loading.Failed).Then(State.Set(3)),
    If(Loading.Canceled).Then(State.Set(4)),
    Code.Set(Loading.Failure));
```

`handle.Failure` is the classified failure as a number: `None`, `Offline`, `NotSignedIn`,
`RateLimited`, `Denied`, `NotFound`, `Timeout`, `Unknown`. It reads `None` while the attempt is
pending, and after a success and after a cancellation.

## Telling one failure from another

`handle.FailedAs(reason)` is true when the current attempt ended as a failure of that one
classification. It is false while the attempt is pending, after a success, after a cancellation, and
after a failure of any other classification:

```csharp
On.Update(
    If(Loading.FailedAs(OperationFailure.NotFound)).Then(Missing.Set(true)),
    If(Loading.FailedAs(OperationFailure.Timeout)).Then(Loading.Retry()));
```

`OperationFailure` is in the same namespace as `Script`, so a script names it without a `using`
line. `Failed` stays true for a failure of any classification. `FailedAs(OperationFailure.None)` is
refused while `Build()` runs, because a failed attempt always carries a classification, and so is a
number cast to `OperationFailure` that names none of its values.

## Cancelling and retrying

```csharp
Loading.Cancel();
Loading.Retry();
```

`Cancel()` cancels a pending attempt and leaves a terminal one as it is. It promises nothing about
rolling back an effect that has already reached the outside.

`Retry()` starts a new attempt, and is refused unless the current one has failed or been cancelled.
The new attempt is pending; what restarts the underlying work is the family call you bind with `.As`,
so a retry is normally followed by another `Asset.Load(...).As(handle)`.

## Loading and releasing an asset

```csharp
Asset.Load(Guard).As(Loading);        // a declared Prefab
Asset.Load(Poster).As(PosterLoad);    // a declared Texture2D
Asset.Load(Resource<Texture2D>("Posters/Stripe")).As(PosterLoad);
Asset.Release(Loading);
```

`Asset.Load` is incomplete without `.As(handle)`, because the handle is the only way to see the
outcome. `Asset.Release(handle)` drops this owner's hold on what the attempt produced, and is refused
until that attempt has succeeded.

`Resource<T>(key)` names an asset in a Unity `Resources` folder. It takes an input kind, such as
`Prefab` or `Texture2D`, and a relative, extension-free Resources path with no leading slash, which
is checked where the line is written. A bound Inspector reference and `Resource<T>(key)` are the two
sources this version offers.

## A worked example

```csharp
using CodeSmile.LunyScript;

public sealed partial class GuardPost : Script
{
    [Asset] public Prefab Guard { get; private set; }
    [Variable] public Flag Manned { get; private set; }

    Operation<Prefab> Loading;

    protected override void Build()
    {
        Loading = Define.Operation<Prefab>(nameof(Loading));
        Sentry = Define.Object();

        On.Ready(Asset.Load(Guard).As(Loading));

        When.Operation(Loading).Succeeded(
            Object.Create(Loading).ChildOf().Into(Sentry),
            Manned.Set(true));
        When.Operation(Loading).Failed(Manned.Set(false));
        When.Operation(Loading).Finished(Asset.Release(Loading));
    }
}
```

## What to read next

- [Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html) — `Bind.Object()`
  and what a binding does when its object is missing.
- [Custom data and files](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/custom-data-and-files.html) — `Define.Data`,
  `Bind.Data`, and loading text, JSON, PNG and WAV files.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  `Object.Create` and the rest of the lifetime surface.
- [Object pools](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/object-pools.html) — reusing prefab copies with
  `Define.Pool` and `Object.Spawn`.
- [Player input](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/player-input.html) — rebinding, which uses the same
  operation handle.
- [Networking and cloud save](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/networking-and-cloud-save.html) — the
  cloud family and its own watches.
- Generated reference:
  [`AssetFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.AssetFactory.html),
  [`AssetAttribute`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.AssetAttribute.html),
  [`Resource<T>`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Resource-1.html),
  [`Operation`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Operation.html),
  [`DefineFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.DefineFactory.html),
  [`OperationWatchBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.OperationWatchBuilder.html).
