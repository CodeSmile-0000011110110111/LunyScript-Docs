# User interface

Show a value on a label your UXML already lays out:

```csharp
using CodeSmile.LunyScript;

public sealed partial class HealthHud : Script
{
    [Variable] public Number Health { get; private set; }

    protected override void Build()
    {
        var health = Panel.Label("health");
        health.BindText(Text.Format("{0}% HP", Health));
    }
}
```

`Panel.Label("health")` names an element the UXML document already contains. `BindText` writes the
formatted text onto that label whenever `Health` changes, and writes nothing on a frame where it
did not change.

## What the factory reaches

`Panel` is LunyScript's view of UI Toolkit. Unity owns the UXML document, the USS stylesheet, the
`PanelSettings` asset and the control types; the script names elements, binds values to them,
routes their events, places an authored fragment, and shows or hides a panel.

The supported scene component is `PanelRenderer`. `UIDocument` is not a supported path. A script
that declares an element and finds no `PanelRenderer` reports the mistake once and the object still
runs, with binds writing nothing and reads returning the kind's resting value.

## The seven element kinds

Each call names an element in the document and returns a typed handle. The name must match the
UXML `name` attribute, and comparison is case sensitive.

| Call | The UXML control it expects |
| --- | --- |
| `Panel.Label(name)` | `Label` |
| `Panel.Button(name)` | `Button` |
| `Panel.Toggle(name)` | `Toggle` |
| `Panel.ProgressBar(name)` | `ProgressBar` |
| `Panel.Slider(name)` | `Slider` |
| `Panel.TextField(name)` | `TextField` |
| `Panel.Group(name)` | any element, used as a container |

```csharp
var health = Panel.Label("health");
var start = Panel.Button("start");
var mute = Panel.Toggle("mute");
var bar = Panel.ProgressBar("health-bar");
var volume = Panel.Slider("volume");
var nameField = Panel.TextField("player-name");
var panelBody = Panel.Group("body");
```

Declaring one name as two different kinds in one scope is refused while `Build()` runs, and so is an
empty or whitespace name. An element the document does not contain, or one that is a different
control than the handle expects, is reported once per declaration and the object still runs.

Elements are resolved to their `VisualElement` once per object when it spawns, and again when the
`PanelRenderer` reloads its tree. Nothing queries the visual tree per use. A panel finishes loading
after the script starts, so a bound value that settled in the meantime is written as soon as its
element resolves rather than being treated as already written.

## Writing values onto elements

A bind is a standing declaration: it writes when the value changes. A `Set` is a one-shot block you
place in an event list, and it writes every time that block runs.

| Call | What it writes |
| --- | --- |
| `label.BindText(value)` | The label's text, whenever the value changes. |
| `label.SetText(value)` | The label's text, once, where the block runs. |
| `toggle.BindValue(flag)` | The toggle's checked state, whenever the flag or condition changes. |
| `bar.SetValue(number)` | The progress bar's value, once. |
| `volume.BindValue(number)` | The slider's value, whenever the number changes. |
| `handle.SetVisible(flag)` | `display`, once, so a hidden element takes no space. |
| `handle.SetEnabled(flag)` | Whether the element accepts input, once. |
| `handle.BindVisible(condition)` | `display`, whenever the condition's value changes. |
| `handle.BindEnabled(condition)` | Whether the element accepts input, whenever the condition changes. |

```csharp
health.BindText(Text.Format("{0}% HP", Health));
bar.BindValue(Health);
mute.BindValue(Muted);

HideHud = Define.Message();
On.Ready(health.SetText(Score), start.SetEnabled(CanStart));
On.Message(HideHud, panelBody.SetVisible(false));
```

`BindText` accepts a Number, a `Text.Format` and a Text variable. A label bound to a `Text.Format`, or to a
text declared without a byte count, shows a line of any length; a label bound to a text declared with a
`TextCapacity` shows what that text holds, up to its usable bytes. `BindValue` and `SetValue` are on
`Toggle`, `ProgressBar` and `Slider`. `SetVisible`, `SetEnabled`, `BindVisible` and `BindEnabled`
are on every kind.

A `Slider` holds a single-precision value inside the low and high values its UXML sets. A write
converts the number to single precision, and the slider clamps it to its range. `volume.Value` reads
the slider rounded to 7 significant digits, so 0.37 written to a slider reads back as 0.37, and a
saved setting holds 0.37 rather than 0.3700000047683716. A script's own write, from `BindValue` or
`SetValue`, does not run `When.UI(volume).ValueChanged`; a player's drag, key press or navigation
does.

## Following a condition

A condition, such as `Coins >= 10`, `Time.IsPaused` or `!Ended`, goes wherever an element takes a
flag. `SetVisible`, `SetEnabled` and a toggle's `SetValue` write what the condition says when the
block runs. `BindVisible`, `BindEnabled` and a toggle's `BindValue` keep the element following the
condition: they write it once it resolves and again on each frame where the condition's value
changed. A Flag variable works as a condition too.

<pre><code>Choosing = Define.Flag(nameof(Choosing), true);
Ended = Define.Flag(nameof(Ended), false);
Coins = Define.Number(nameof(Coins), 0);
Bought = Define.Message();
var review = Panel.Group("review");
var resume = Panel.Button("resume");
var buy = Panel.Button("buy");

<strong>review.BindVisible(Choosing &amp; !Ended)</strong>;
<strong>resume.BindEnabled(Time.IsPaused)</strong>;
On.Message(Bought, Coins.Subtract(10), <strong>buy.SetEnabled(Coins &gt;= 10)</strong>);
</code></pre>

A script runs its binds after `On.Update`, its state machines and its routines, so a bound element
follows a state machine's transition in the same frame. One element's display has one
`BindVisible` or any number of `SetVisible` writes, never both, and the same holds for
`BindEnabled` and `SetEnabled`: `Build()` refuses a second bind, and a bind beside a write, naming
both lines. `BindVisible` and `BindEnabled` take no `true` or `false`, because a bound literal
never changes; write `SetVisible(false)` in `On.Ready` instead.

## Reading an element back

`toggle.Value`, `bar.Value` and `volume.Value` are expressions you can use wherever a flag or a number is accepted.
`label.Text` and `field.Text` are text expressions a variable can be set from.

```csharp
On.Update(If(mute.Value).Then(MusicLevel.Set(0.0)));
When.UI(nameField).ValueChanged(PlayerName.Set(nameField.Text));
```

## Reacting to an element

`When.UI` is a watch on an element, not an `On.*` event on the object.

| Watch | When it runs |
| --- | --- |
| `When.UI(button).Activated(..)` | The button was clicked or submitted with the navigation key. |
| `When.UI(toggle).ValueChanged(..)` | The toggle was checked or unchecked. |
| `When.UI(field).ValueChanged(..)` | The text field's value changed. |
| `When.UI(bar).ValueChanged(..)` | The progress bar's value changed. |
| `When.UI(volume).ValueChanged(..)` | The player moved the slider. |

```csharp
When.UI(start).Activated(StartRequested.Set(true));
When.UI(mute).ValueChanged(Muted.Set(mute.Value));
volume.BindValue(Volume);
When.UI(volume).ValueChanged(Volume.Set(volume.Value));
```

`Activated` covers a pointer click and a navigation submit, so a control reached with a gamepad runs
the same blocks as one clicked with a mouse. An activation that arrives while the script is not
processing, because its process mode is suppressed, is dropped rather than queued.

## A second panel on another object

`Panel.For(binding)` targets the `PanelRenderer` on a bound object instead of the object the script
runs on. Names then resolve inside that panel's document.

```csharp
Hud = Bind.Object();

var hudHealth = Panel.For(Hud).Label("health");
```

## Placing an authored fragment

`Panel.Place(uxml)` clones a declared `VisualTreeAsset` input into one of the nine reserved HUD regions. The
handle it returns is the name scope for names inside that clone, so two clones of the same asset do
not collide.

```csharp
PlayerPortrait = Bind.VisualTreeAsset();

var first = Panel.Place(PlayerPortrait).At(Anchor.TopLeft);
var second = Panel.Place(PlayerPortrait).At(Anchor.TopRight);
first.Label("health").BindText(FirstHealth);
second.Label("health").BindText(SecondHealth);
```

The nine anchors are `TopLeft`, `Top`, `TopRight`, `Left`, `Center`, `Right`, `BottomLeft`,
`Bottom` and `BottomRight`. Each name is the UXML name of the region that receives the clone, so
the HUD document must contain an element with that name; a HUD that does not is reported once and
the placement does nothing. Insert `.In(view)` before `.At` to place into the panel on a declared
view binding instead of the host panel: `Panel.Place(Portrait).In(SecondView).At(Anchor.Top)`.

A `Place` whose UXML input has no asset assigned refuses the spawn, because a UXML fragment is a
data asset LunyScript will not substitute. `Panel.Place(uxml)` without `.At` or `.In` is refused
while `Build()` runs.

## Labels at world positions

A damage number, a name over a character or a hint over a door stays over a point in the scene
while the camera and the object move. `Panel.Place(uxml).Over()` clones the fragment into a screen
panel and moves it to the screen point of the object the script runs on, every frame:

```csharp
DamageNumber = Bind.VisualTreeAsset();
HitMarker = Bind.VisualTreeAsset();

var popup = Panel.Place(DamageNumber).Over().Offset(0, Rise, 0);
var amount = popup.Label("amount");
amount.BindText(Damage);

var marker = Panel.Place(HitMarker).At(LastHit);
```

| Call | What the clone is kept over |
| --- | --- |
| `.Over()` | The object this script runs on. |
| `.At(position)` | A world position, read every frame, so a Vector3 variable moves it. `.At(x, y, z)` takes its three numbers. |
| `.Offset(x, y, z)` | Optional, once: world units added to the point, read every frame. `.Offset(offset)` takes one Vector3. |

The panel that receives the clone is the object's own `PanelRenderer`, or the one `.In(panel)` names
before the anchor. Give the object a `PanelRenderer` that uses the same screen `PanelSettings` as the
HUD: every screen panel sharing one `PanelSettings` is drawn as one panel. The handle is the clone's
name scope, as it is for a region, and it is not a block.

LunyScript writes the clone's position and visibility and nothing else. The clone's top-left corner
sits on the projected point, so align the content in the fragment's USS, for example
`translate: -50% -100%` to centre a label above the point. A number that climbs is an `Offset` whose
Number the script raises:

```csharp
var climb = Run(Rise.Add(Time.Delta)).Over(0.7);
Hit = Define.Message();
Show = Define.Routine();
On.Message(Hit, Rise.Set(1.3), climb.Start(), Routine(Show).Run(
    amount.SetVisible(true), Wait(0.7), amount.SetVisible(false)));
```

What each placement does, from spawn to despawn:

- **Initial state.** The clone is made when the object spawns and its panel has loaded, and it stays
  hidden until its first projection, so it never shows at the panel's corner.
- **Targeting.** The point is projected through the camera on the panel's GameObject, or through
  `Camera.main` when that GameObject has no camera.
- **Ownership.** The clone belongs to the object that placed it; two objects running one script
  each own their own clone.
- **Lifetime.** The clone moves once per frame, after every script's `On.LateUpdate`. It is hidden
  while its object is disabled, it is made again when its panel rebuilds its tree, and it leaves the
  panel when its object despawns. It keeps following while its script is paused.
- **Failure.** A point behind the camera or outside its view hides the label and is not reported.
  No camera, or a position that is not a finite number, hides the label and is reported once. A
  panel whose `PanelSettings` render it in world space receives no clone, which is reported once.

One placement is one label. A second hit while the number shows rewrites it; several numbers at
once need several placements.

## Opening and closing a menu

```csharp
PauseMenu = Bind.Object();
ClosePause = Define.Message();

On.Ready(Panel.Open(PauseMenu).ForPlayer(0));
On.Message(ClosePause, Panel.Close(PauseMenu).ForPlayer(0));
```

`Open` writes `display` on the panel's root so it takes space again; `Close` writes `display = None`
and keeps the element cache, so reopening does not resolve every name again. `ForPlayer` is
required and names which local player the call is for. Each panel carries its own state, so opening
one panel does not affect another, and repeating `Open` on a panel that is already open writes
nothing.

Focus is not part of this version: `Open` records no focus and `Close` restores none.

## What is not here yet

Code-only control creation (`Panel.Create`), Unity's runtime DataBinding bridge, `AssignPlayer`,
`Destroy`, `Slider`, class-list writes, `Focus` and `SetShared` are planned and not implemented.
For labels at world positions, `Over(target)` for another object and a new label for each hit from a
fixed number of clones are planned; world-space panels turned to face the camera are not.
`docs/proposals/ui-toolkit.md` is the family document and records which of those are should-have.

## Seeing it run

`Assets/CodeSmile/LunyScript/ApiExamples/UserInterface.unity` runs everything on
this page: the two bound controls, the three separately scoped `health` Labels, both `When.UI`
watches, and `Panel.Open` and `Panel.Close` on a second `PanelRenderer`. Open it and press Play.

`Assets/CodeSmile/LunyScript/ApiExamples/DamageNumbers.unity` runs the labels at world positions:
two dummies walk, each with a name plate, a damage number struck every 0.9 seconds and a marker
left where the last hit landed.

## What to read next

- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — the values a
  bind writes onto an element.
- [Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) — declaring the
  GameObject and UXML inputs `Panel.For`, `Panel.Place` and `Panel.Open` take.
- [Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html) — what a suppressed
  process mode does to binds and to `When.UI`.
- Generated reference:
  [`PanelFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.PanelFactory.html),
  [`Anchor`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Anchor.html).
