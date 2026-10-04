# Looking at and using objects

Let a player look at an object, see what pressing a button would do, and use it. Two scripts are
enough: one on the object, one on the player's avatar.

<pre><code>using CodeSmile.LunyScript;

public sealed partial class LeverScript : Script
{
    protected override void Build()
    {
        Pulled = Define.Flag(nameof(Pulled));
        <strong>Interaction.Target("Pull")</strong>;
        <strong>On.Interacted(</strong>Pulled.Set(true)<strong>)</strong>;
    }
}

public sealed partial class HeroScript : Script
{
    protected override void Build() =>
        <strong>Interaction.Focus(</strong>Input.Button("Interact")<strong>)</strong>;
}
</code></pre>

Put `LeverScript` on an object with a collider, and `HeroScript` on an avatar whose LunyScript
Behaviour has its **Local Player** field set. Whatever lies at the centre of `Camera.main`, within
three metres of the avatar and not hidden behind another collider, is focused, and a press of that
player's Interact action uses it: the lever runs `On.Interacted`.

Interaction is new in this version, and its names can still change.

## A target and a focuser

- **A target** is an object whose script writes `Interaction.Target(prompt)`. Every local player can
  focus it at the same time. `On.Focused` runs when the first player starts focusing it,
  `On.Unfocused` when the last one stops, and `On.Interacted` each time a player uses it.
- **A focuser** is an object whose script writes `Interaction.Focus(button)`: a player's avatar. It
  reads the local player its object is bound to and focuses at most one target.

The runner decides what every focuser sees once per frame, before any script's `On.Update`, so all
scripts in a frame agree on what is focused.

## A pickup two players can see

A pickup with a model that rises while it is focused and a glow that is on only then, and an avatar
whose player may hold the keyboard and mouse or a gamepad:

<pre><code>public sealed partial class PickupScript : Script
{
    protected override void Build()
    {
        Volume = Bind.Object();
        Model = Bind.Object();
        Glow = Bind.Object();
        Credits = Define.Number(nameof(Credits)).Shared();

        <strong>Interaction.Target("Pick up")</strong>
            <strong>.Volume(Volume).Visual(Model).Effect(Glow)</strong>;
        <strong>On.Interacted(Interaction.Disable()</strong>, Credits.Add(1),
            Object.Destroy()<strong>)</strong>;
    }
}

public sealed partial class AvatarScript : Script
{
    protected override void Build()
    {
        PlayerView = Bind.Object();
        Prompt = Bind.VisualTreeAsset();

        <strong>Interaction.Focus(</strong>Input.Button("Interact")<strong>)</strong>
            <strong>.Pointer(</strong>Input.Vector2("Point")<strong>)</strong>
            <strong>.InView(PlayerView)</strong>
            <strong>.Within(3.5)</strong>
            <strong>.Prompt(Prompt)</strong>;
    }
}
</code></pre>

- `Volume` names the object whose colliders a focus ray has to reach, usually a trigger box around
  the target. Without it, the target's own colliders are its volume.
- `Visual` names the child that rises, grows and turns while the target is focused.
- `Effect` names a child that is active only while at least one player focuses the target: a light,
  a particle system or a sound that plays when it is enabled.
- `InView` names the object with the player's `Camera`. Without it, `Camera.main` is used.
- `Within` is how far from the avatar the focused point may be, in metres; three by default.
- `Prompt` is a UXML document with a `Label` named `prompt`. Each player sees it in their own view,
  over the target, showing the target's prompt text.

## Cursor or centre of the view

A focuser written with `.Pointer(position)` uses the cursor while its player holds the keyboard and
mouse, and the centre of its view while that player holds a gamepad. The mode follows the device:
the player who pairs the keyboard and mouse uses the cursor, and every other player aims with the
centre of their view. There is only ever one cursor; when two players are both said to hold one,
the lower player number keeps it and the Console says so once.

`Interaction.UsesPointer` is true while a focuser uses the cursor, so the avatar's script, which
writes `Interaction.Focus` as above, can move its camera child:

<pre><code>On.Update(If(<strong>Interaction.UsesPointer</strong>)
    .Then(Transform.Child(0).SetLocalPosition(0, 8.5, -4.5))
    .Else(Transform.Child(0).SetLocalPosition(0, 0.8, -3.2)));
</code></pre>

What a focuser focuses, each frame:

1. A focuser whose player is not present, because nobody paired that player yet, focuses nothing.
2. The ray goes through the cursor, or through the centre of the view, of the focuser's camera.
3. While the cursor is over a button, toggle, text field or another control that takes focus, or
   over a button authored with `focusable="false"`, in a panel a LunyScript script uses, it focuses
   nothing, and a press goes to the control. A `Label` does not take the cursor.
4. The first collider along the ray decides. The avatar's own colliders are skipped, and so are
   triggers that are no target's volume. A target's volume is focused when the point the ray hit is
   within range; any other collider hides what is behind it.

A gamepad player presses a focused UI Toolkit button with the south button, the same button a game
usually binds to Interact, and moves focus between buttons with the stick. A button in an on-screen
panel that only the cursor should press, such as a Reset button, is authored with
`focusable="false"`: a click still presses it, the cursor over it still focuses nothing, and a
gamepad never gives it focus, so the gamepad player's Interact never presses it.

## What the target shows

- **The effect child** is deactivated when the target appears, activated on the frame the first
  player focuses it, and deactivated on the frame the last one stops. A second player arriving while
  another stays changes nothing.
- **The visual** moves as the target's `InteractionStyle` asset says: `Lift` metres up, `Scale`
  times its size, `Spin` degrees per second, each blended in and out over `Blend` seconds. It
  returns to the pose it had when the focus started, also when the target is disabled or removed.
  Create a style with **Assets > Create > LunyScript > Interaction Style**, and assign it to the
  `InteractionStyle` row the script's Inspector shows. Without one, the object uses the defaults and
  the Console says so once.
- **The prompt** is the target's prompt text. Write it as a `Text` variable to change it while the
  game runs:

<pre><code>Label = Define.Text(nameof(Label));
<strong>Interaction.Target(Label)</strong>;
On.Ready(Label.Set("Open"));
<strong>On.Interacted(</strong>Label.Set("Close")<strong>)</strong>;
</code></pre>

## Using a target

A focuser uses its target when its player performs the button this frame. Uses are delivered in
ascending local player number. `Interaction.Player` is the number of the player whose use is
running, readable only inside `On.Interacted`:

<pre><code>HostCredits = Define.Number(nameof(HostCredits)).Shared();
GuestCredits = Define.Number(nameof(GuestCredits)).Shared();
<strong>Interaction.Target("Take")</strong>;

<strong>On.Interacted(</strong>
    <strong>Interaction.Disable()</strong>,
    If(<strong>Interaction.Player &lt;= 1</strong>)
        .Then(HostCredits.Add(1))
        .Else(GuestCredits.Add(1)),
    Object.Destroy()<strong>)</strong>;
</code></pre>

A target that ran `Interaction.Disable()`, or asked to be destroyed, despawned or deactivated, in an
earlier use of the same frame receives no later one. When two players press in the same frame, the
lower player number takes the pickup and the other press does nothing. `Interaction.Enable()` makes
the target usable again; a disabled target releases every player at once.

## Preparing objects in the Editor

**Tools > LunyScript > Interaction Setup** prepares the selected scene object or prefab instance:

1. An object without a LunyScript Behaviour gets one, running the script you choose from the scripts
   that write `Interaction.Target`.
2. Name the visual child. The visual is never created for you.
3. Leave **Volume** or **Effect** empty, and **Apply** creates the child `Focus Volume`, a trigger box
   around the visual and the object's solid colliders, or `Focus Effect`, an inactive empty child.
4. **Apply** is one Undo step. Applying again adds nothing and keeps every change you made since. A
   prefab instance receives the changes as overrides; prepare a prefab by preparing an instance in a
   scene and applying the overrides, or by saving a prepared scene object as a prefab.

The same window tunes the style. **Preview** moves the visual in Edit Mode and puts it back when
Preview is turned off, the selection changes, the window closes, Play Mode starts or the scene is
saved. In Play Mode the values change the selected running object only. **Apply to Style** writes
them into the style asset, as one Undo step.

## Mistakes and what happens

<pre><code><strong>Interaction.Target("Open")</strong>;
<strong>Interaction.Target("Close")</strong>;
</code></pre>

The script type is refused when it is built: one object is one target. Use a `Text` prompt instead.

<pre><code>Opened = Define.Flag(nameof(Opened));
<strong>On.Interacted(</strong>Opened.Set(true)<strong>)</strong>;   // without Interaction.Target
</code></pre>

Refused when the script type is built, naming the call the line needs. `Interaction.IsFocusing`
without `Interaction.Focus` is refused the same way.

<pre><code>Who = Define.Number(nameof(Who));
On.Update(Who.Set(<strong>Interaction.Player</strong>));
</code></pre>

Builds. When it runs outside `On.Interacted`, the block fails like any failing block, and the
message names `Interaction.Player` and `On.Interacted`.

A volume whose object carries no collider is reported once, and nothing focuses that target. An
avatar whose **Local Player** field is -1 reads no player, so it never focuses anything.

## Call list

These lines are call signatures, not a script you can paste. Brackets mark a clause you may leave
out. `prompt` is a string or a text variable, `Define.Text(name)`. `binding` is an object binding,
`Bind.Object()`. `button` is a button action, `Input.Button(name)`, and `position` a two-component
action, `Input.Vector2(name)`. `metres` is a number. `uxml` is a UXML input,
`Bind.VisualTreeAsset()`. `blocks` are the blocks to run.

<pre><code>Interaction.Target(prompt) [ .Volume(binding) ] [ .Visual(binding) ]
    [ .Effect(binding) ]
On.Focused(blocks)
On.Unfocused(blocks)
On.Interacted(blocks)
Interaction.Player                    // inside On.Interacted
Interaction.Enable()
Interaction.Disable()
Interaction.IsFocused
Interaction.FocusCount
Interaction.Focus(button) [ .Pointer(position) ] [ .InView(binding) ]
    [ .Within(metres) ] [ .Prompt(uxml) ]
Interaction.IsFocusing
Interaction.UsesPointer
</code></pre>

## What to read next

- The example scene `ApiDemos/Interaction.unity`: a door, a lamp and a pickup for two local players,
  one with the keyboard and mouse and one with a gamepad.
- [Player input](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/player-input.html) — actions, and pairing local
  players.
- [User interface](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/user-interface.html) — placing a label over a point
  in the scene.
- [Showing, hiding and tinting objects](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/showing-hiding-and-tinting.html) —
  `Object.For(binding).Activate()` and `Deactivate()`, which turn a bound object on and off.
- Generated reference:
  [`InteractionFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.InteractionFactory.html),
  [`InteractionTarget`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.InteractionTarget.html),
  [`InteractionFocus`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.InteractionFocus.html).
