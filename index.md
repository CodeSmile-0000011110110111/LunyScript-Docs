# LunyScript Docs

**LunyScript** is a C# scripting layer for Unity. A script is one class with one `Build()` method.
Inside `Build()` you compose blocks that say what an object does, and the runtime runs those blocks
against every object that carries the script. Add the `LunyScript Behaviour` component to a game
object, pick the script, press Play.

![The LunyScript Debugger window showing the Values example script while it runs](https://codesmile-0000011110110111.github.io/LunyScript-Docs/assets/runtime-debugger.png)

*The debugger shows a running script: the blocks it runs, the result each one last recorded and how
long ago, which branch each condition took and what it says about the values now, and the script's
values, which can be changed while it runs. [Debugging a running script](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/debugging-a-running-script.html)
describes the window.*

A character that loses health on a spike, regenerates after three seconds without a hit, and shows
its health on the HUD. This is the whole body of its `Build()`:

```csharp
Health = Define.Number(nameof(Health), 100);
SinceHit = Define.Number(nameof(SinceHit));

On.TriggerEnter(
    If(Other.HasTag("Spike")).Then(Health.Subtract(25), SinceHit.Set(0)));

On.Update(
    SinceHit.Add(Time.Delta),
    If(SinceHit > 3).Then(Health.Add(10 * Time.Delta)),
    Health.Clamp(0, 100),
    If(Health <= 0).Then(Object.Destroy()));

Panel.Label("health").BindText(Text.Format("{0:0} HP", Health));
```

The first two lines declare `Health` and `SinceHit`; the generator writes the two properties they
assign. `health` is the name of a label in the object's UI Toolkit panel.
[Writing a script](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/writing-a-script.html) shows the class around a
`Build()`. The blocks are composed once for the script type; every object that carries the script
keeps its own `Health` and `SinceHit`.

## The API in highlights

**Steps in order, over as many frames as they take.** A routine runs its steps one after another,
each finishing before the next begins. A timed move takes a duration and one of 31 named easing
curves. This lift has no Rigidbody, so `Motion` writes its transform:

```csharp
Block rise = Motion.MoveTo(0, 4, 0).Over(2).Seconds().Ease(Easing.InOutSine);
Block sink = Motion.MoveTo(0, 0, 0).Over(2).Seconds().Ease(Easing.InOutSine);

On.Ready(Routine("Lift").Run(rise, sink));
```

**Work on a cadence, declared once and started from any event.** `Every` sets the interval, `For`
the duration or the count, and the unit is a trailing call:

```csharp
var heartbeat = Run(Pulse.Increment()).Every(1).Seconds();
var burst = Run(Flash.Set(1)).Every(200).Milliseconds().For(5).Times();

On.Ready(heartbeat.Start());
On.TriggerEnter(burst.Start());
```

**An action chosen by score.** Each option carries a number expression. Every frame the highest
score wins and its action runs. `Hold` keeps a winner for at least one second, so the character
does not flip between the two when the scores sit close together. Write to `Food` and `Rest` from
anywhere:

```csharp
On.Ready(Choose("needs").Highest(
    Option(Food).Then(Motion.MoveTo(4, 0, 0).AtSpeed(2)),
    Option(Rest).Then(Motion.MoveTo(0, 0, 6).AtSpeed(1)))
    .Hold(Seconds(1)));
```

**One move call, whichever component the object has.** `Motion.MoveBy` becomes
`CharacterController.Move` on a character, `Rigidbody.MovePosition` on a kinematic body, and a
transform write on an object with neither. The same line runs on all three:

```csharp
On.FixedUpdate(Motion.MoveBy(0.02, 0, 0).InLocalSpace());
```

**Pause the game and keep this script running.** A process mode decides which scripts tick while
the game is paused. The pause menu sets `Always`, so its own blocks keep running while every
pausable script stops:

```csharp
SetProcessMode(Process.Always);

On.Update(If(MenuOpen).Then(Time.Pause()).Else(Time.Resume()));
```

**Input per local player, and a viewport per player.** An action is declared by player index and
name, and read as a condition or a value. A view names which camera rig it renders and which part
of the screen it covers:

```csharp
var fire = Input.ForPlayer(0).Button("Fire");
var move = Input.ForPlayer(0).Vector2("Move");

When.Input(fire).Performed(Shots.Increment());
On.Update(Direction.Set(move.Value));

On.Ready(
    View.For(TopScreen).SetViewport(0, 0.5, 1, 0.5),
    View.For(TopScreen).SetCamera(PlayerOneRig),
    View.For(BottomScreen).SetViewport(0, 0, 1, 0.5),
    View.For(BottomScreen).SetCamera(PlayerTwoRig));
```

**Networking by naming a cadence.** A synchronised variable and a transform channel each say how
often they are sent. `Score` is written and read with the same calls as any other variable, and
every peer reads the same value:

```csharp
Score = Var.DefineSynced<Number>(nameof(Score), SyncCadence.OnChange, 0);
Sync.Position(SyncCadence.EveryTick);

On.Update(If(Net.HasAuthority).Then(Score.Add(Time.Delta)));
```

**Work that takes more than a frame ends in one of four outcomes.** A load, an interactive rebind,
a scene load and a cloud round trip are each observed through one operation handle, with the same
four words: `Succeeded`, `Failed`, `Canceled`, `Finished`:

```csharp
On.Ready(Asset.Load(Guard).As(Loading));

When.Operation(Loading).Succeeded(Object.Create(Loading), Manned.Set(true));
When.Operation(Loading).Failed(Manned.Set(false));
When.Operation(Loading).Finished(Asset.Release(Loading));
```

## One line from each feature

Every line below is a complete statement inside `Build()`, given the variables, handles and declared
assets it names. The manual has one page per group.

```csharp
// Values
On.Update(Charge.Subtract(Time.Delta * 2));
On.Update(If(Charge < 5 & Armed).Then(Powered.Set(false)));
When.Var(Charge).Changed(Alarm.Set(true));
TeamScore = Define.Number(nameof(TeamScore)).Shared();
On.Update(ForEach(Slots).Do(item => Total.Add(item)));
On.Ready(Random.Number().From(loot).In(1, 100).Into(Roll));
On.LateUpdate(Readout.Set(Text.Format("{0:1} s", Age)));
On.Update(Ratio.Set(Math.Clamp(Charge / 10, 0, 1)));

// Running blocks
On.Ready(Health.Set(100), Powered.Set(true));
On.TriggerEnter(If(Other.HasTag("Spike")).Then(Hits.Increment()));
On.Ready(Run(Pulse.Increment()).Every(1).Seconds().Start());
On.Ready(Routine("Patrol").Run(walkOut, walkBack));
On.Ready(Routine("Doors").Run(InParallel(openLeft, openRight)));
On.Ready(Choose("ai").Highest(Option(Food).Then(eat), Option(Rest).Then(nap)));
On.Ready(Behavior("Guard").Root(Repeat(Task(patrol))).Start());
On.Update(If(MenuOpen).Then(Time.Pause()).Else(Time.Resume()));
SetProcessMode(Process.Always);
On.Ready(Gate.Open("Cutscene", GateCategory.Input | GateCategory.Camera));

// Moving objects
On.Update(Transform.RotateBy(0, 90 * Time.Delta, 0));
On.FixedUpdate(Motion.MoveTo(4, 0, 0).AtSpeed(2));
On.FixedUpdate(Motion.AddForce(0, 0, 12).InLocalSpace());
On.FixedUpdate(Motion.TeleportTo(Landing).WithRotation(Facing));
On.FixedUpdate(Collision.RayCast().InLocalSpace().Length(2).Into(Ahead));

// Players
When.Input(fire).Performed(Shots.Increment());
When.UI(rebind).Activated(fire.Rebind().As(Rebinding));
On.Ready(Input.Cursor.Lock(), Input.Cursor.Hide());
On.Ready(Camera.For(ChaseRig).Follow());
On.Ready(View.For(Screen).SetViewport(0, 0.5, 1, 0.5));
Panel.Label("health").BindText(Text.Format("{0}% HP", Health));
When.UI(start).Activated(StartRequested.Set(true));

// Content
On.Ready(Asset.Load(Guard).As(Loading));
When.Operation(Loading).Succeeded(Object.Create(Loading));
Shells = Define.Pool(nameof(Shells)).From(Shell).HardCap(16).Prewarm(4);
On.TriggerEnter(Object.Spawn(Shells).At(new Vector3(0, 1, 0)));
On.Update(If(Health <= 0).Then(Object.Destroy()));
On.Update(Animator.Number("Speed").Set(Speed));
On.CollisionEnter(Audio.PlayOneShot(BreakClip));
When.Input(fire).Performed(Particles.For(MuzzleFlash).Emit(12));
On.Ready(Scene.Load(Vault).Additive().As(LoadingVault));
When.SceneLoaded(Vault).Do(VaultReady.Set(true));

// Peers and the cloud
Score = Var.DefineSynced<Number>(nameof(Score), SyncCadence.OnChange, 0);
Sync.Position(SyncCadence.EveryTick);
On.Update(If(Net.HasAuthority).Then(Score.Add(Time.Delta)));
On.Message("Ping", Pings.Increment());
On.Update(If(!Net.HasAuthority).Then(Net.Send.ToAuthority("Ping")));
On.Ready(Cloud.Load(Career).As(Downloading));
When.Cloud(Downloading).Succeeded(Prompt.Set("Loaded."));
```

## What LunyScript is, and is not

A `Script` is a plain C# class. It is not a `ScriptableObject` and not a `MonoBehaviour`. The
`LunyScript Behaviour` component is the one object that connects a GameObject to a script type.

LunyScript has no visual authoring surface: no node graph, no flowchart editor, and no way of
composing a script by dragging instead of writing C#. The visual surface it commits to is the
runtime debugger, which observes a running script and changes its state from the outside while the
game runs.

v1 targets Unity 6.7 LTS, desktop and web, four local split-screen players as the design point and
sixteen networked players as the high-end target.

## Documentation

- [Manual](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/) — one page per feature: what it is for, the shortest
  script that uses it, and what to read next.
- [API Reference](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/) — generated type documentation from the runtime
  assemblies.
