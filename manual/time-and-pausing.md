# Time, pausing and gates

Pause the whole game from one line, and keep this script ticking through it:

```csharp
using CodeSmile.LunyScript;

public sealed partial class PauseMenu : Script
{
    [Variable] public Flag MenuOpen { get; private set; }

    protected override void Build()
    {
        SetProcessMode(Process.Always);

        On.Update(
            If(MenuOpen).Then(Time.Pause()).Else(Time.Resume()));
    }
}
```

Every pausable script stops while `MenuOpen` is true. This one keeps running, because it set its
process mode to `Always`.

## Reading the clock

```csharp
Age.Add(Time.Delta);                   // frame length in game seconds
RealAge.Add(Time.Delta.Unscaled());    // frame length in real seconds
Since.Set(Time.Elapsed);               // game seconds since the run started
Wall.Set(Time.Elapsed.Unscaled());     // real seconds since the run started
Speed.Set(Time.Scale);
If(Time.IsPaused).Then(Dim.Set(true));
```

`Unscaled()` gives the real-time reading, which a pause and a changed time scale both leave alone.
`Time.Scale` has one reading, so `Time.Scale.Unscaled()` does not compile.

`Time.IsPaused` reads the runner's paused flag. Writing a time scale of zero stops game time from
advancing and leaves that flag as it was, so the two answer different questions.

## Changing the clock

```csharp
Time.SetScale(0.5);   // half speed; 1 is ordinary speed, above 1 runs faster
Time.Pause();         // sets the paused flag and zeroes the scale
Time.Resume();        // restores the last positive scale, or 1
```

`Time.SetScale` refuses a negative, NaN or infinite scale when the block runs. Zero is a valid scale.
Pausing a paused game and resuming a running game both change nothing.

## Process modes: which scripts keep running

A process mode decides whether one script's tick events are delivered while the game is paused. Set
it once, directly in `Build()`.

| Mode | While the game runs | While the game is paused |
| --- | --- | --- |
| `Process.Pausable` | Ticks. | Skips its tick events. |
| `Process.WhenPaused` | Skips its tick events. | Ticks. |
| `Process.Always` | Ticks. | Ticks. |
| `Process.Disabled` | Skips its tick events. | Skips its tick events. |
| `Process.Inherit` | Whatever the nearest parent that set a mode uses. | The same. |

```csharp
SetProcessMode(Process.Pausable);    // ordinary gameplay
SetProcessMode(Process.WhenPaused);  // a tool that runs only while paused
SetProcessMode(Process.Always);      // the pause menu that holds the pause
SetProcessMode(Process.Disabled);    // a script kept for its lifecycle events
SetProcessMode(Process.Inherit);     // whatever the nearest parent uses
```

```csharp
protected override void Build()
{
    SetProcessMode(Process.WhenPaused);
    On.Update(Rewind.Add(Time.Delta.Unscaled()));
}
```

`Inherit` walks up the parents and falls back to `Pausable` when no parent set a mode; leaving
`SetProcessMode` out is the same as `Inherit`. `Disabled` stops the tick events while lifecycle
events such as `On.Enabled` and `On.Despawned` keep arriving, and the GameObject stays active.

Each object can override its script's mode in the Inspector, through the `LunyScript Behaviour`
component's **Process Mode** field. The field's `Script Default` entry uses what `Build()` set.

## Collisions while the game is paused

A paused `Pausable` script still runs its six contact events, so a collision can resume the game:

```csharp
On.CollisionEnter(Time.Resume());
```

Unity does the same for a `MonoBehaviour` that is not updating, so that a collision can wake it.
The script's tick events stay paused. A script whose component is disabled receives no contact
event, paused or not.

`Time.Pause()` also stops physics. At a time scale of zero Unity's fixed step does not run, so
with Unity's default physics stepping nothing moves and nothing collides during a pause. A paused
script meets a contact in two cases:

- The game steps physics itself: `Physics.simulationMode` is `SimulationMode.Script` and the game
  calls `Physics.Simulate`, for example with the real frame time.
- The contact comes from the physics step in which another script's contact event paused the game.
  Unity sends every callback of one step after that step, and each of them still arrives.

To pause contact events with the game, open **Edit > Project Settings > LunyScript** and turn on
**Time.Pause pauses contact events**. A `Pausable` script then skips its contact events while
`Time.Pause()` holds the game, as it skips `On.Update`. `WhenPaused` and `Always` scripts
receive them either way. The setting applies to the whole project; no script line changes it.
`Time.SetScale(0)` pauses no script, so it leaves contact events alone under either setting.

The setting is stored in `Assets/Resources/LunyScriptSettings.asset`, which the page creates the
first time you change the value. A built game reads it when the first LunyScript object starts,
and updating LunyScript leaves it as it is. It may live in any `Resources` folder; keep one asset
of that name. Without the asset, the setting is off.

## Gates: suppressing input or camera writes

A gate is a named suppression of one or more categories, opened and closed by name. It leaves the
clock alone, so every script keeps ticking while a gate is open.

```csharp
Gate.Open("Review", GateCategory.Input);
Gate.Open("Review", GateCategory.Input | GateCategory.Camera);
Gate.Close("Review");
```

| Category | What it suppresses |
| --- | --- |
| `GateCategory.Input` | Action reads return their resting value, and every action occurrence reads false. |
| `GateCategory.Camera` | Camera writes are ignored. |
| `GateCategory.None` | Nothing. |

```csharp
// With the Input gate open, this reads false while the button is held.
Gate.Open("Menu", GateCategory.Input);
On.Update(If(fire.IsPressed).Then(Shots.Inc()));

// With the Camera gate open, this writes nothing.
Gate.Open("Menu", GateCategory.Camera);
On.Update(Camera.For(ChaseRig).Follow(Avatar));

// A gate opened on None leaves both of those lines working.
Gate.Open("Menu", GateCategory.None);
```

An open input gate leaves the cursor alone and leaves interactive rebinding working, so a rebinding
screen can hold the gate open while it captures a new binding. Pausing the game opens no gate, and
opening a gate pauses nothing; combine the two when you want both.

A gate can also be declared, and another script then names it through the declaring script:

```csharp
Loading = Define.Gate();                        // in LoaderScript
Gate.Open(Loading, GateCategory.Input);
Gate.Close(LoaderScript.Gates.Loading);         // in any other script
```

A declared gate is its own gate: another script's own `Loading`, and the string gate `"Loading"`,
are two more. See
[Talking to other scripts](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/talking-to-other-scripts.html).

## The two together

```csharp
protected override void Build()
{
    SetProcessMode(Process.Always);

    On.Update(
        Countdown.Subtract(Time.Delta.Unscaled()),
        If(MenuOpen)
            .Then(Time.Pause(),
                Gate.Open("Menu", GateCategory.Input | GateCategory.Camera))
            .Else(Time.Resume(), Gate.Close("Menu")));
}
```

The script sets `Always` so that its own countdown keeps running while it holds the game paused, and
opens both gates so the player's movement input and the chase camera stop reaching the game.

## What to read next

- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) — the
  tick events a process mode governs.
- [Physics](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/physics.html) — contact events while the game is paused.
- [Player input](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/player-input.html) — what an open input gate changes.
- Generated reference:
  [`TimeFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.TimeFactory.html),
  [`GateFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.GateFactory.html),
  [`Process`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.Process.html),
  [`GateCategory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.GateCategory.html).
