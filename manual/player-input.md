# Player input

Read a player's action in two lines:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Shooter : Script
{
    [Variable] public Number Shots { get; private set; }

    protected override void Build()
    {
        var fire = Input.ForPlayer(0).Button("Fire");

        On.Update(If(fire.IsPressed).Then(Shots.Add(Time.Delta)));
    }
}
```

`"Fire"` is the action name as your Input System action asset spells it. The first local player is
index 0.

## Declaring an action

`Input.ForPlayer(n)` returns the surface for one local player. Its four calls declare an action and
give you back a handle to read:

| Call | What it declares | Reads as |
| --- | --- | --- |
| `.Button(name)` | A button action. | `IsPressed` as a condition, `Value` as a number. |
| `.Number(name)` | An axis or analogue action. | `Value` as a number, 0 at rest. |
| `.Vector2(name)` | A two-axis action. | `Value` as a `Vector3` whose Z is 0. |
| `.Vector3(name)` | A three-axis action. | `Value` as a `Vector3`. |

```csharp
var fire   = Input.ForPlayer(0).Button("Fire");
var throttle = Input.ForPlayer(0).Number("Throttle");
var move   = Input.ForPlayer(0).Vector2("Move");
var aim    = Input.ForPlayer(0).Vector3("Aim");

On.Update(
    If(fire.IsPressed).Then(Firing.Set(true)),
    Speed.Set(throttle.Value),
    Direction.Set(move.Value),
    AimPoint.Set(aim.Value));
```

`Vector2` and `Vector3` are the Input System's control type names, which is why they carry those
spellings rather than the product's own `Vector2` and `Vector3`.

## Reading the last value an action received

`Value` and `IsPressed` return the last value the action received. The Input System backend records
each action's value and press state while the Input System processes input, and a read returns that
record in whichever event runs it, so the same line works in `On.Update` and in `On.FixedUpdate`.
Read the input that drives a Rigidbody in `On.FixedUpdate`, where Motion's forces and kinematic
moves run:

```csharp
var move  = Input.ForPlayer(0).Vector2("Move");
var boost = Input.ForPlayer(0).Button("Boost");

On.FixedUpdate(
    Motion.AddForce(move.Value.X * 6, 0, move.Value.Y * 6).InWorldSpace(),
    If(boost.IsPressed).Then(Motion.AddForce(0, 14, 0).InWorldSpace()));
```

- Unity runs a frame's fixed steps before the Input System processes that frame's input, so a fixed
  step reads the value the previous frame received. Every fixed step of one frame reads the same
  value.
- A held stick or button keeps its value until the action receives another, so it reads the same in
  every fixed step and every frame while it is held.
- An action that has received nothing reads its resting value: `IsPressed` false, `Value` 0 or
  `Vector3.Zero`. So does an action that did not resolve.
- With the Input System's update mode set to process events in fixed update, `On.Update` reads what
  the frame's last fixed step received.

The **FixedStepInput** scene in the API examples drives a kinematic rover with `Motion.MoveBy` and
pushes and lifts a ball with `Motion.AddForce`, all from reads in `On.FixedUpdate`.

The player is a number, from 0 upwards, that a set of devices is paired with. A negative number is
refused while `Build()` runs. [Local players](#local-players) covers pairing and one script for
every player. Declaring the same player, name and kind twice is one declaration;
declaring one name as two kinds is refused while `Build()` runs. The Input System's `Axis` and
`Analog` control types both map onto `Number`.

## Watching an action

A watch runs blocks at one of the action's three phases, so a press is handled once rather than on
every frame it is held:

```csharp
When.Input(fire).Started(Charging.Set(true));
When.Input(fire).Performed(Shots.Increment());
When.Input(fire).Canceled(Charging.Set(false));
```

The three are the Input System action's own phases. A plain button starts and performs on the frame
it goes down and cancels on the frame it comes up. A stick starts when it leaves rest, performs on
every change and cancels when it returns to rest. A Hold interaction starts on the press, performs
when the hold time is reached, and cancels on the release. A pass-through action performs on every
change and never starts or cancels. `Canceled` carries one L, matching the Input System's own
spelling.

A watch runs after the frame's `On.Update` and sees each occurrence the action received since the
previous frame's update, once: several presses between two frames run it once, and an occurrence a
frame did not deliver, because an input gate was open or the script was paused, is not delivered
later. No watch runs
inside the Input System's own processing. A force or an impulse belongs in `On.FixedUpdate`, so read
`IsPressed` there rather than applying it from a watch.

## Rebinding

An interactive rebind captures the next control the player uses and assigns it to the action. It
takes more than one frame, so its outcome is observed through an operation handle:

```csharp
Operation Rebinding;

protected override void Build()
{
    Rebinding = Define.Operation(nameof(Rebinding));
    var fire  = Input.ForPlayer(0).Button("Fire");

    On.Message("StartRebind", fire.Rebind().As(Rebinding));

    When.Operation(Rebinding).Succeeded(Prompt.Set("Bound."));
    When.Operation(Rebinding).Failed(Prompt.Set("Nothing was bound."));
}
```

[Assets and operations](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/assets-and-operations.html) explains the
operation handle in full.

A control that another action of the same player already uses is refused: the
rebind fails as `Denied` and the action keeps its old control. Escape cancels a
capture, and so does `Rebinding.Cancel()`.

### Showing the control an action uses

`BoundControl` is the control path an action uses now, such as
`<Keyboard>/space`. Write it into a text variable for a settings row:

```csharp
FireKey = Define.Text(nameof(FireKey));
var fire = Input.ForPlayer(0).Button("Fire");
Panel.Label("fire-control").BindText(FireKey);
On.Update(FireKey.Set(fire.BoundControl));
```

It reads the control a rebind or a load applied, and the action asset's
control otherwise. An action whose only binding is a composite, such as
W A S D, has no one control and reads empty text; read each part instead.

### Resetting a control

`ResetBinding()` returns an action to the control the action asset gives it:

```csharp
var reset = Panel.Button("fire-reset");
When.UI(reset).Activated(fire.ResetBinding());
```

### Rebinding one key of W A S D

`Part(name)` names one part of an action's composite binding. The part has its
own `Rebind()`, `BoundControl` and `ResetBinding()`:

```csharp
var move = Input.ForPlayer(0).Vector2("Move");
var up = move.Part("up");
var upRow = Panel.Button("up-rebind");
When.UI(upRow).Activated(up.Rebind().As(RebindUp));
On.Update(UpKey.Set(up.BoundControl));
```

Write the part's name the way the action asset spells it. Unity's action
editor names the parts of a 2D vector `up`, `down`, `left` and `right`, and the
name is case sensitive. A part rebind refuses a control another part of the
same composite uses, so W cannot become both up and down. Rebinding the whole
`move` fails as `Denied`, because a composite has one control per part.

### Keeping rebound controls between sessions

A rebind lasts until the game quits. List the player's bindings in a Settings
document and they are saved and loaded with the document's other fields:

```csharp
Preferences = Define.Document(nameof(Preferences))
    .Field(nameof(MusicVolume), MusicVolume)
    .Bindings(Input.ForPlayer(0));

On.Ready(Settings.Load(Preferences).As(LoadingPreferences));
When.Operation(RebindFire).Succeeded(
    Settings.Save(Preferences).As(SavingPreferences));
```

- Nothing is written until the script saves the document. `Preferences.IsDirty`
  is true after a rebind or a reset, until the next save.
- A load replaces the player's controls with the saved ones. A control the
  saved copy does not mention returns to the action asset's.
- A saved control whose binding a newer version of the game removed is
  skipped, and `Preferences.Omitted(Input.ForPlayer(0))` is true after that load.
- Only a Settings document lists bindings, and each player once. List several
  players with `.Bindings(Input.ForPlayer(2))` and so on. With local players,
  numbers 0 and 1 both name the host, so list the host under one of them.

[Saving progress and settings](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/saving-progress-and-settings.html)
covers documents in full.

## The cursor

Cursor lock and visibility are machine-wide writes, so four local players share one cursor.

```csharp
Input.Cursor.Lock();       // CursorLockMode.Locked
Input.Cursor.Unlock();     // CursorLockMode.None
Input.Cursor.Confine();    // CursorLockMode.Confined
Input.Cursor.Show();
Input.Cursor.Hide();

If(Input.Cursor.IsLocked).Then(Crosshair.Set(true));
If(Input.Cursor.IsVisible).Then(Pointer.Set(true));
```

Lock and visibility are separate settings, so a locked cursor can still be visible. A confined
cursor stays inside the game window and moves; `IsLocked` reads false while it is confined. The last
write wins. Before any write, the cursor is unlocked and visible.

## Local players

A second player joins by pressing a button on their own gamepad. Give the input backend a number of
local players where your C# installs it:

```csharp
var provider = new InputSystemProvider(actions, 4);
LunyScriptRuntime.DefaultRunner.InputGateway.UseProvider(provider);
```

With that setup nobody is present until a button press. A script opens pairing, and the first press
on a device that no player holds makes that player the host. Each later press pairs a guest with the
lowest free number from 2. The number 4 in the line above allows the host and three guests. A key
pairs the keyboard and the mouse together as one player. `new InputSystemProvider(actions)`, with no
number, keeps player 0 present from the start on every device and pairs nothing.

```csharp
On.Ready(Input.Pairing.Open());
When.Player(1).Paired(Status.Set("Player 1 is in"));
When.Player(2).Paired(Status.Set("Player 2 is in"));
When.Player(2).Left(Status.Set("Player 2 left"));
When.Player(2).Lost(Status.Set("Player 2: reconnect the controller"));
When.Player(2).Returned(Status.Set("Player 2 is back"));
```

Player numbers 0 and 1 both name the host, so a script written for `Input.ForPlayer(0)` reads the host
too. `Input.PlayerCount` counts the host once. The host stays for the whole session: a leave of player
0 or 1 changes nothing, so show a Leave button only the host could press as disabled. A script that
watches the same change on both numbers, such as `When.Player(0).Paired` and `When.Player(1).Paired`,
runs it once for the host, through `When.Player(1)`, and the Console says so once.

| Call | What it does |
| --- | --- |
| `Input.Pairing.Open()`, `.Close()` | Starts and stops pairing new players. |
| `Input.Pairing.IsOpen` | A condition: pairing is open. |
| `Input.ForPlayer(n).Leave()` | Releases a guest's devices and frees the number. The host stays. |
| `Input.ForPlayer(n).IsPaired` | A condition: someone holds that player number. |
| `Input.ForPlayer(n).IsLost` | A condition: that player's controller is unplugged. |
| `Input.PlayerCount` | How many players are in, the host counted once. |
| `When.Player(n).Paired`, `.Left` | Runs when someone takes the number, and when they leave it. |
| `When.Player(n).Lost`, `.Returned` | Runs when that player's controller disconnects, and when it is back. |

A player whose controller is unplugged stays paired and reads resting values. Plugging the same
controller back in returns it. Pressing a button on another controller that nobody holds also
returns that player, with pairing open or closed. Player numbers are never renumbered: when player 2
of 3 leaves, player 3 keeps number 3, and the next person takes number 2. A script that starts after
a player paired still runs `Paired` for that player, so a game scene loaded after the lobby sees
everyone who paired in the lobby.

### One script for every player

Leave the player out, and an input read uses the player bound to the object the script runs on:

```csharp
var move = Input.Vector2("Move");
On.Update(If(!Input.IsLost).Then(Transform.MoveBy(
    move.Value.X * Time.Delta * 3.0, 0.0, move.Value.Y * Time.Delta * 3.0)));
When.Input(Input.Button("Leave")).Performed(Input.Leave());
When.Player().Left(Object.Destroy());
```

Bind an object to a player when you create or spawn it, or with the **Local Player** field on its
**LunyScript Behaviour**:

```csharp
When.Player(1).Paired(Object.Create(Avatar).ForPlayer(1));
When.Player(2).Paired(Object.Create(Avatar).ForPlayer(2));
```

`ForPlayer(n)` binds every script the new object starts, its children included. `Object.Spawn(pool)`
takes the same clause. An object bound
to no player reads resting values, and the Console says so once per script type.

A button every player shares, such as pause, is `Input.AnyPlayer().Button(name)`. It is pressed while
any player holds it.

```csharp
var pause = Input.AnyPlayer().Button("Pause");
When.Input(pause).Performed(Time.Pause());
```

The **LocalPlayers** scene in the API examples runs a lobby and two avatars on one script: the host,
player 1, and one guest, player 2. With fewer than two gamepads connected, the scene adds two virtual
gamepads and presses their buttons, and says so on screen.

The **Rebinding** scene in the API examples is a controls screen: one row per control with its bound
control, Rebind and Reset, and Save and Load for a Settings document that keeps the controls.

## Taking the backend back out

A project-asset action asset outlives every scene, so installing the backend once in the first scene
needs no teardown. A component that creates the action asset itself, with
`ScriptableObject.CreateInstance<InputActionAsset>()`, releases the backend before it destroys that
asset:

```csharp
private void OnDestroy()
{
    m_Runner.InputGateway.ReleaseProvider(m_Provider);
    Destroy(m_Actions);
}
```

The runner outlives the scene that installed a backend on it, so a backend left installed goes on
reading an asset the scene destroyed, and every action the scripts of that scene declared is reported
as its local player not being present. `ReleaseProvider` takes a backend out only when it is the
installed one, and reports nothing: every action goes back to its resting value. Hold the runner in a
field, taken in `Awake`, rather than reading `LunyScriptRuntime.DefaultRunner` again in `OnDestroy`:
that type is reset as a Play Mode session ends.

## What an open input gate changes

An input gate makes every action read return its resting value, so `IsPressed` reads false and
`Value` reads 0 or `Vector3.Zero`, and it makes every action occurrence read false. It leaves interactive
rebind capture running, leaves the cursor as it is, and leaves pairing running, so a rebinding
screen can hold the gate open while it captures.

```csharp
Gate.Open("Menu", GateCategory.Input);
// fire.IsPressed now reads false however hard the player holds the button.
Gate.Close("Menu");
```

[Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html) covers gates in full.

## What to read next

- [Cameras and viewports](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/cameras-and-viewports.html) — giving each
  local player a viewport and a camera.
- [Time, pausing and gates](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/time-and-pausing.html) — suppressing input
  while a menu is open.
- Generated reference:
  [`InputFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.InputFactory.html),
  [`PlayerInputFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.PlayerInputFactory.html),
  [`PairingInputFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.PairingInputFactory.html),
  [`PlayerWatchBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.PlayerWatchBuilder.html),
  [`CursorInputFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CursorInputFactory.html),
  [`InputPart`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.InputPart.html),
  [`WhenFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.WhenFactory.html).
