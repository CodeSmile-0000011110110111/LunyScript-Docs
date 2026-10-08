# Cameras and viewports

Point a view at a camera rig and tell that rig what to follow:

```csharp
using CodeSmile.LunyScript;

public sealed partial class PlayerCamera : Script
{
    protected override void Build()
    {
        Screen = Bind.Object();
        ChaseRig = Bind.Object();
        On.Ready(
            View.For(Screen).SetCamera(ChaseRig),
            Camera.For(ChaseRig).Follow());
    }
}
```

Assign `Screen` and `ChaseRig` on the `LunyScript Behaviour` component in the Inspector, or name the
objects `Screen` and `ChaseRig`, press Play, and the chase rig follows this object.

## The two surfaces

`View` is about where an image is drawn: which camera rig a view renders, and which rectangle of the
screen it occupies. `Camera` is about what a rig is aimed at: what it follows, what it looks at, and
which objects it keeps in frame.

Both take an object binding, which
[Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html) explains. A camera
rig is a Cinemachine rig. With the Cinemachine package installed, LunyScript installs its camera
backend when Play starts, unless **Cinemachine** is turned off under Edit, Project Settings,
LunyScript, Supplied providers. Where Cinemachine is absent or turned off, every `View` and `Camera`
block writes nothing and reports that once.

## Views

```csharp
View.For(Screen).SetCamera(ChaseRig);
View.For(Screen).SetViewport(0, 0.5, 1, 0.5);
View.For(Screen).SetViewport(new Vector2(0, 0.5), new Vector2(1, 0.5));
```

`SetCamera` selects which rig this view renders, replacing whatever it rendered before.
`SetViewport(x, y, width, height)` takes fractions of the screen: `x` is the left edge and `y` the
bottom edge, both from 0 to 1, and `width` and `height` are how much of the screen the view covers.
`SetViewport(position, size)` takes the same four numbers as two `Vector2` values, the corner and the
size, so the two lines above set the same viewport.

Two-player split screen is two views, each with its own viewport and rig:

```csharp
On.Ready(
    View.For(TopScreen).SetViewport(0, 0.5, 1, 0.5),
    View.For(TopScreen).SetCamera(PlayerOneRig),
    View.For(BottomScreen).SetViewport(0, 0, 1, 0.5),
    View.For(BottomScreen).SetCamera(PlayerTwoRig));
```

## A split screen for local players

`View.SplitScreen` gives each paired local player a view of their own and lays the views out again
whenever a player pairs or leaves, so a script writes no viewport and no pairing watch for it:

<pre><code>View1 = Bind.Object();
View2 = Bind.Object();
View3 = Bind.Object();
View4 = Bind.Object();

On.Ready(Input.Pairing.Open(),
    <strong>View.SplitScreen(View1, View2, View3, View4)</strong>);
</code></pre>

The first view is local player 1's, the host's, and the others are local players 2 to 4. A player is
in while `Input.ForPlayer(n).IsPaired` reads true, so a player whose controller is unplugged keeps
the view. Two or three views work the same way, for two or three players.

| Players in | Where each view goes |
| --- | --- |
| None | The first view covers the screen, or the shared view when there is one. |
| One | That player's view covers the screen. |
| Two | The lower player number takes the top half, the other the bottom half. |
| Three or four | Each takes the quarter of their number: 1 top left, 2 top right, 3 bottom left, 4 bottom right. |

A view with no share gets a viewport of zero width and height, and Unity does not draw a camera
whose viewport is empty.

`Within` keeps the views in a part of the screen, here right of a menu that takes the left third,
and `Shared` names a view for the screen while nobody is in and for the free quarter while three
players are:

<pre><code>GroupView = Bind.Object();

On.Ready(<strong>View.SplitScreen(View1, View2, View3, View4)
    .Within(0.33, 0, 0.67, 1).Shared(GroupView)</strong>);
</code></pre>

- **The area** takes the four fractions `SetViewport` takes, or a position and a size as two
  `Vector2` values. It has to lie on the screen: an area that does not is refused when the script
  type is built, or reported once when its numbers come from variables.
- **When.** The block lays the views out when it runs, and again at the end of every frame in which a
  player paired or left, before that frame is drawn. A frame with no change writes nothing, so the
  block may sit in `On.Update` to follow an area held in variables.
- **One split screen at a time.** It belongs to the object whose script ran it and ends when that
  object's script ends. Running `View.SplitScreen` again replaces it; one from another object
  replaces it too and writes a warning.
- **`View.For(view).SetViewport` on one of its views ends it**, and every view keeps the viewport it
  has. That is how a screen switches to one view for everybody; running `View.SplitScreen` again
  switches back. `View.For(view).SetCamera(rig)` does not end it.
- **`Within` comes before `Shared`**, each once, and one view given twice, or a shared view that is
  also a player's view, is refused when the script type is built.

Each view carries a Camera and a Cinemachine Brain that listens to that player's output channel, so
every view shows its own player's rig. A scene with screen-space UI also keeps a camera with a depth
above every view and a viewport that is not empty: the Universal Render Pipeline draws that UI with
the last camera it renders, and a view with an empty viewport hides the UI when it is last.

## What a rig tracks

| Call | What it sets |
| --- | --- |
| `Camera.For(rig).Follow()` | The rig follows this script's own object. |
| `Camera.For(rig).Follow(target)` | The rig follows the object that binding holds. |
| `Camera.For(rig).LookAt()` | The rig aims at this script's own object. |
| `Camera.For(rig).LookAt(target)` | The rig aims at the object that binding holds. |

```csharp
On.Ready(
    Camera.For(ChaseRig).Follow(),         // this object
    Camera.For(ArenaRig).Follow(Avatar),   // a binding
    Camera.For(ChaseRig).LookAt(),         // this object
    Camera.For(ArenaRig).LookAt(Avatar));  // a binding
```

Calling `Follow()` with no target on a script whose host has no scene object throws; name a binding
instead.

## Keeping several objects in frame

A rig with a target group holds a set of targets, each with a weight and a radius:

```csharp
Camera.For(ArenaRig).Targets.Add(Avatar, 1, 0.5);   // a named target
Camera.For(ArenaRig).Targets.Add(1, 0.5);           // this script's own object
Camera.For(ArenaRig).Targets.SetWeight(Avatar, 2);
Camera.For(ArenaRig).Targets.SetRadius(Avatar, 1.5);
Camera.For(ArenaRig).Targets.Remove(Avatar);
Camera.For(ArenaRig).Targets.Remove();              // this script's own object
Camera.For(ArenaRig).Targets.Clear();
```

The weight decides how strongly a target pulls the framing, and the radius is how much room around it
the rig keeps clear. Both are required on `Add`; there is no default for either. `SetWeight` and
`SetRadius` always name a target. A rig with no target group refuses these calls when they run and
writes nothing.

## Following every player, and keeping them together

`Camera.FollowGroup()` keeps a rig's target group on every local player's object, so a shared
camera frames whoever is playing without a script adding and removing each one:

```csharp
On.Ready(Camera.FollowGroup().For(GroupRig));
On.Ready(Camera.FollowGroup().Bounds(20, 12).For(GroupRig));
```

- **Who is in the group.** The object `Object.Create(prefab).ForPlayer(n)` produced, or whose
  LunyScript Behaviour's Local Player field names `n`, while player `n` is paired. An object
  joins in the frame its player pairs and leaves when the player leaves or the object ends. Each
  goes in with weight 1 and its footprint as its radius; targets the scene authored stay.
- **The rig does the framing.** Its Follow, LookAt, framing and damping stay as authored, so the rig
  has to follow its own target group.
- **`Bounds(width, height)` keeps the players together.** The group, from its outermost footprint
  edges, stays within `width` on world X and `height` on world Z. `Bounds(size)` takes the two as one
  `Vector2`. The rectangle is centred on the
  group and moves with it. A player walking away from the others stops at the limit; a group
  walking the same way moves as one; a player who does not move stays put.
- **Bounds limits Motion.** `Motion.MoveBy` and `Motion.MoveTo` of a member are applied together at
  the end of each tick and shortened where they would spread the group too far. A `Transform`
  write, a teleport or a placement is not limited: a group found wider than its Bounds is reported
  once, and the players can then close up but not spread further.
- **How long.** The registration belongs to the script that ran it and ends with it, or when a
  `Camera.For(rig).Targets` call reaches the same rig. Ending it writes nothing to the rig.

A paired player with no object for 60 frames is reported once, naming the missing `ForPlayer`
create or Local Player field.

## A worked example

```csharp
using CodeSmile.LunyScript;

public sealed partial class ArenaCamera : Script
{
    protected override void Build()
    {
        Screen = Bind.Object();
        ArenaRig = Bind.Object();
        PlayerOne = Bind.Object();
        PlayerTwo = Bind.Object();
        On.Ready(
            View.For(Screen).SetViewport(0, 0, 1, 1),
            View.For(Screen).SetCamera(ArenaRig),
            Camera.For(ArenaRig).Targets.Clear(),
            Camera.For(ArenaRig).Targets.Add(PlayerOne, 1, 0.5),
            Camera.For(ArenaRig).Targets.Add(PlayerTwo, 1, 0.5));
    }
}
```

## Rays from the screen

`Camera.ScreenRay(position)` is the world ray through a screen position. It starts on the camera's
near plane under the position and points into the screen. A cast travels along it with `Along`:

```csharp
using CodeSmile.LunyScript;

public sealed partial class ClickToMove : Script
{
    public HitResult Ground { get; private set; }

    protected override void Build()
    {
        Ground = Define.Hit(nameof(Ground));
        Destination = Define.Vector3(nameof(Destination));
        var point = Input.Vector2("Point");
        var click = Input.Button("Click");

        On.Ready(Destination.Set(Transform.WorldPosition));
        When.Input(click).Performed(
            Collision.RayCast()
                .Along(Camera.ScreenRay(point.Value)).Into(Ground),
            If(Ground.HasHit).Then(Destination.Set(
                Ground.Point.WithY(Transform.WorldPosition.Y))));
        On.Update(Motion.MoveTo(Destination).AtSpeed(5));
    }
}
```

`Point` and `Click` are actions in the action asset of the object's local player: `Point` is a
pass-through action on `<Pointer>/position`, which is the mouse, pen and touch position, and
`Click` is a button. [Player input](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/player-input.html) explains the
action asset and the object's Local Player field.

The position is in screen pixels from the bottom left, which is what the pointer reports. A `Vector2`
and two numbers work as well, and a `Vector3` position ignores its third number, which is how
`Input.Vector2(...).Value` arrives:

```csharp
var centre = Camera.ScreenRay(640, 360);
var corner = Camera.ScreenRay(new Vector2(0, 0));
```

Without `InView` the ray goes through `Camera.main`, the enabled camera tagged MainCamera. `InView`
names the object that carries another camera, such as the left half of a split screen:

```csharp
LeftView = Bind.Object();
var left = Camera.ScreenRay(point.Value).InView(LeftView);
```

A ray is read each time a block that uses it runs, from the camera's pose and the position at that
moment, so a ray written once in `Build()` follows the pointer and the camera, a running Cinemachine
blend included. `Origin` and `Direction` read it as two `Vector3` values:

```csharp
On.Update(Aim.Set(left.Origin + left.Direction * 10));
```

`Along(ray)` is `From(ray.Origin).Towards(ray.Direction)` with one camera read, on each of the four
casts. It is written without `From`, `Offset` and `Towards`, and a query that has it is in world
space; the other combinations are refused when the script type is built.

When the ray has no camera to read:

- A position outside the camera's rectangle of the screen reads a zero origin and a zero direction,
  with no message, and a cast along it runs no query and clears its result. A pointer that crosses
  a split screen leaves one of the views every frame.
- No main camera, a view binding that holds no object, an object without a camera and a disabled
  camera read the same zeros, and the Console says which, once per script and line.
- A camera that draws into a texture takes the position in that texture's pixels.

## What an open camera gate changes

A camera gate makes every camera write be ignored, so a cutscene or a menu can hold the framing it
set while the rest of the game keeps running. A screen ray is a read and keeps working; an input gate
mutes the pointer and click actions instead:

```csharp
Gate.Open("Cutscene", GateCategory.Camera);
// Camera.For(ChaseRig).Follow(Avatar) now writes nothing.
Gate.Close("Cutscene");
```

## What to read next

- [Player input](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/player-input.html) — pairing each viewport with a
  local player's actions.
- [Binding scene objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/binding-scene-objects.html) — declaring the
  view and rig bindings these calls take.
- [Collision queries](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/collision-queries.html) — the casts `Along`
  finishes.
- Generated reference:
  [`ViewFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ViewFactory.html),
  [`SplitScreenBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.SplitScreenBuilder.html),
  [`CameraFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CameraFactory.html),
  [`ScreenRay`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ScreenRay.html),
  [`CameraTargetsBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.CameraTargetsBuilder.html).
