# Motion

Move an object through whichever physics component it has, with one call:

```csharp
using CodeSmile.LunyScript;

public sealed class Thruster : Script
{
    protected override void Build() =>
        On.FixedUpdate(Motion.AddForce(0, 0, 12).InLocalSpace());
}
```

Put this on a GameObject with a dynamic Rigidbody and it accelerates forward along its own axis.

## What Motion is for, and how it differs from Transform

`Transform.MoveBy` writes the pose immediately and involves no physics.
`Motion.MoveBy` is directed at whichever component the object actually has, and it produces the right
call for that component:

| The object has | `Motion.MoveBy` becomes |
| --- | --- |
| A `CharacterController` | `CharacterController.Move`, so the move collides and slides. |
| A kinematic `Rigidbody` | `Rigidbody.MovePosition`, so other bodies see the move. |
| No body and no controller | A transform write. |
| A dynamic `Rigidbody` | A refusal, because a dynamic body is moved by force. |

```csharp
// One line, on four different objects, each with its own component.
On.FixedUpdate(Motion.MoveBy(0.02, 0, 0).InLocalSpace());
```

A call that is refused — because the object carries the wrong component, or because the call is made
in an event the component does not take it in — is reported once and then ignored. Nothing is queued
for a later step.

## Instead of a Transform write

On an object with a Rigidbody, kinematic or dynamic, Transform does not write the position or the
rotation: the write is refused, and the Console shows one error for that line, naming the Motion
call to use. Move the object with that call in `On.FixedUpdate`:

```csharp
// Crate has a kinematic Rigidbody.
On.FixedUpdate(Motion.MoveBy(0, 0, 0.1));      // not Transform.MoveBy
On.FixedUpdate(Motion.TeleportTo(0, 2, 0));    // not SetWorldPosition
On.FixedUpdate(
    Motion.FaceTowards(Pad).DegreesPerSecond(90)); // not LookAt
```

A dynamic Rigidbody is pushed instead, with `Motion.AddForce`, `Motion.AddImpulse` or
`Motion.SetVelocity`, and placed with `Motion.TeleportTo`.
[Transform](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/transform.html#an-object-with-a-rigidbody) lists the
Motion call for each refused write, for both kinds of body.

## Moving a character or a kinematic body

```csharp
Motion.MoveBy(0.02, 0, 0);            // own axes; (delta) takes a Vector3
Motion.MoveBy(0.02, 0, 0).InWorldSpace();
Motion.MoveTo(Pad).AtSpeed(2);        // world units per second
Motion.MoveTo(4, 0, 0).Over(2);       // two seconds
Motion.MoveTo(4, 0, 0).Over(500).Milliseconds();
Motion.MoveTo(4, 0, 0).Over(2).Ease(Easing.InOutSine);
Motion.RotateTo(Facing).DegreesPerSecond(90);
Motion.RotateTo(Facing).Over(2);
Motion.RotateTo(Facing).Over(1).Ease(Easing.OutBack);
Motion.FaceTowards(Pad).DegreesPerSecond(90);
Motion.FaceTowards(1, 0, 0).DegreesPerSecond(180);
```

`MoveTo` is incomplete until either `AtSpeed` or `Over`; the two are exclusive. `Over` takes an
amount in seconds, and a unit call may follow it: `Over(2)` and `Over(2).Seconds()` are the same
move, and `Milliseconds()`, `Minutes()` and `Hours()` name the other units.
`RotateTo` takes a `Rotation`, which
[Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) explains how to
build. `FaceTowards` turns towards a world point at a fixed rate and keeps facing it for as long as
the block keeps running; it uses world up, and a target that coincides with the object writes
nothing.

`Ease` follows a timed move only, after the amount or after its unit call, and takes one of the 31
named curves in
`Easing`: `Linear`, and `In`, `Out` and `InOut` of Sine, Quad, Cubic, Quart, Quint, Expo, Circ,
Back, Elastic and Bounce. The curve decides where along the path the object is at each point of the
duration, and every curve ends on the destination. Back, Elastic and Bounce leave the straight path
on purpose: `OutBack` goes past the destination and returns, and `OutBounce` reaches it and bounces
back short of it three times. A move at `AtSpeed` or a turn at `DegreesPerSecond` takes no `Ease`.

A kinematic Rigidbody must run these in `On.FixedUpdate`. A CharacterController and an object with
neither component accept them from any event.

A CharacterController is moved once per frame. The first `MoveBy`, `MoveTo`, follow or lead step, or
`ApplyGravity` that moves it in a frame runs, whichever script and event it comes from; every later one in
that frame is ignored, and the Console shows one error for that line, naming the call that moved the
controller first. The fixed steps of a frame count in that frame. Add the steps together and move once:

```csharp
// Walk is a Vector3 of the walking speed; FallSpeed is a Number the script keeps.
On.Update(
    FallSpeed.Set(FallSpeed - 9.81 * Time.Delta),
    Motion.MoveBy(Walk.X * Time.Delta, FallSpeed * Time.Delta, Walk.Z * Time.Delta).InWorldSpace());
```

On a player's object that a `Camera.FollowGroup().Bounds(width, height)` keeps together with the
other players, `MoveBy` and `MoveTo` are applied at the end of the tick with the other players'
moves, and a step that would spread the group past its Bounds is shortened;
[Cameras and viewports](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/cameras-and-viewports.html) has the rule.

## Falling with gravity

```csharp
On.Update(Motion.ApplyGravity(-9.81));            // world Y, units per second squared
On.Update(Motion.ApplyGravity(0, -9.81, 0));      // or three numbers, or one Vector3
On.Update(If(Landed).Then(Motion.ResetGravity()));
```

`ApplyGravity` accelerates the object. Each time it runs it adds the acceleration to a velocity the
script keeps for the object, then moves the object by that velocity for the time the frame took, so a
fall gets faster frame by frame. The one number is the world Y part, and a negative number pulls down;
`ApplyGravity(x, y, z)` and `ApplyGravity(vector)` take all three parts, in world space. A Number or
`Vector3` variable is read each time.

The velocity stays until something clears it. `ApplyGravity(0)` adds nothing and keeps the object
moving at the speed it had, the way a coasting object does. `Motion.ResetGravity()` sets the velocity
back to zero and moves nothing, so the next `ApplyGravity` starts from rest; it runs in any event.
Nothing detects the ground: decide when the object has landed, for example with a contact event or a
collision query, and reset it then. A successful `Motion.TeleportTo` from the same script also starts
the velocity from zero.

| The object has | `ApplyGravity` | How often |
| --- | --- | --- |
| A `CharacterController` | `CharacterController.Move`, from any event | once per frame, so write it in `On.Update` |
| A kinematic `Rigidbody` | `Rigidbody.MovePosition`, in `On.FixedUpdate` | once per fixed step |
| No body and no controller | a transform write, from any event | once per frame, so write it in `On.Update` |
| A dynamic `Rigidbody` | a refusal: Unity's own gravity moves it | |

A second `ApplyGravity` in the same frame, or the same fixed step, is ignored and the Console shows
one error for that line. While the game is paused no time passes, so nothing falls. On a
CharacterController, `ApplyGravity` is the controller's one move of the frame, so a character that
walks and falls keeps its own fall speed and moves once, as the previous section shows.

## Driving a dynamic body

```csharp
On.FixedUpdate(
    Motion.AddForce(0.7, 0, 0).InWorldSpace(),
    Motion.AddImpulse(0, 2, 0),
    Motion.SetVelocity(-1.2, 0, 0).InWorldSpace(),
    Motion.StopMotion());
```

All four require an active dynamic Rigidbody, and run in `On.FixedUpdate` and in the lifecycle events below; written
anywhere else they are reported once and ignored. `AddImpulse` is a separate call
rather than a force-mode parameter on `AddForce`, so the two read differently at a glance.
`SetVelocity` converts the vector out of the frame you chose before it writes the world velocity.
`StopMotion` clears linear and angular velocity once, at the moment it runs.

## Pushing with an explosion

```csharp
On.FixedUpdate(If(Blasted).Then(
    Motion.AddImpulse(12).AsExplosion(Hub, 6).Upwards(1.5),
    Blasted.Set(false)));
On.FixedUpdate(Motion.AddForce(40).AsExplosion(0, 0, 0, 6));
```

`AddImpulse(strength)` and `AddForce(strength)` take one number and are finished by `AsExplosion(center, radius)`,
which gives the direction: Unity's own `Rigidbody.AddExplosionForce`, pushing this object's body away from a world
point. `AddImpulse` is a one-time blast, so run it once per blast; `AddForce` pushes in every fixed step the block runs
in. The centre is a `Vector3` or three numbers. `Upwards(n)` measures the push direction from `n` units below the
centre, which throws bodies up as well as out; without it the push is straight away from the centre.

Unity scales the strength down with distance and measures that distance to the box around the body's colliders, so a
body whose centre is a little past the radius can still be pushed, weakly. A body whose box is wholly past the radius
is not pushed. The explosion acts on the body the script runs on and finds no other body: put a script on each body a
blast should move. It needs an active dynamic Rigidbody and runs where `AddImpulse` runs, and a radius greater than 0; a
radius of 0 is reported once and pushes nothing. Unity tells the script nothing back, so a script that needs to
know whether a blast reached it decides that by its own rule, such as its distance from the centre.

## Switching a body between kinematic and dynamic

```csharp
On.Spawned(Body.MakeDynamic());
On.FixedUpdate(If(Expired).Then(Body.MakeKinematic()));
```

`Body.MakeKinematic()` stops forces, gravity and contacts from moving the body; a kinematic move such as
`Motion.MoveBy` still does. A dynamic body loses its velocity first, so it stops where it is, and its collider stays as it
was, so other bodies still land on it. `Body.MakeDynamic()` hands the body back to physics, starting from rest.

Both run in `On.FixedUpdate`, and also in the six lifecycle events the next section lists. Written in `On.Update`,
`On.LateUpdate` or any other event, they are reported once and ignored. An object with no Rigidbody writes a warning once
and nothing is switched.

A pool gives back the object, not a fresh body: a copy that was kinematic or moving when it was returned is still that
way when it is handed out again. `On.Spawned(Body.MakeDynamic())` puts it back to a dynamic body at rest before Unity
shows it. [Object pools](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/object-pools.html) has the whole reset.

## Pushing from a lifecycle event

```csharp
On.Enabled(Motion.AddImpulse(0, 3, 0).InWorldSpace());
On.Spawned(Motion.SetVelocity(0, 0, 12).InLocalSpace());
On.Disabled(Motion.StopMotion());
```

`On.Created`, `On.Spawned`, `On.Ready`, `On.Enabled`, `On.Disabled` and `On.Despawned` each run once when an object
starts, stops or changes state, rather than every frame, so a dynamic body takes `AddForce`, `AddImpulse`, an explosion,
`SetVelocity` and `StopMotion` there as well as in `On.FixedUpdate`, and the two body-mode calls too. Unity holds a force
or an impulse added there and applies it at the next physics step, once; a velocity write and `StopMotion` take effect at
the moment they run. A force written in a lifecycle event therefore pushes for one step. A push that lasts belongs in
`On.FixedUpdate`.

The body must be active and dynamic when the call runs, because Unity drops a force on an inactive object. A pooled
copy's `On.Spawned` runs before the pool activates it on every reuse, and `On.Disabled` runs after Unity has deactivated
the object when the object itself is deactivated, so a physical input there is reported once and ignored. On a pooled
object, give the push in `On.Enabled`, which runs after Unity activates the copy, on the first checkout and on every
reuse. `Object.Activate()` written in `On.Spawned` takes effect after that event, so it does not make the copy active for
a force in the same `On.Spawned`.

## Relocating, and observing the result

```csharp
Motion.TeleportTo(Landing);
Motion.TeleportTo(Landing).WithRotation(Facing);
Motion.TeleportTo(0, 3, 0);
Motion.TeleportTo(Beacon).WithRotation(Beacon);

Drift.Set(Body.PositionDelta);
```

`TeleportTo` also clears both velocities on a dynamic body, and writes the pose on a kinematic one.
Omit `WithRotation` and the current orientation is kept. A Rigidbody teleport must run in
`On.FixedUpdate`; a CharacterController or an object with no body may run it from any event.

`Beacon` above is a landmark: an object in the scene, declared with `Beacon = Bind.Object();` and
assigned in the Inspector or found in the scene by its name. Its world position, and with
`WithRotation(Beacon)` its world rotation, are read each time the teleport runs. While the binding
is unavailable, because it found nothing or its object was destroyed, the teleport does nothing and
nothing is logged. A landmark that is inactive is reported once and the teleport does nothing until
it is active again.

`Body.PositionDelta` is the world position after the previous physics step minus the world position
at the step before that, as a `Vector3`. The first reading after a spawn is zero. Reading it anywhere in
`Build()` opts this script type into the per-step copy that produces it, so a script type that never
reads it stores no previous position.

## Flocking an object's children

`Motion.FlockChildren()` moves the children of the object the script runs on,
not the object itself. Its active direct children fly as one flock toward a
goal and keep their distance from each other:

```csharp
using CodeSmile.LunyScript;

public sealed partial class Swarm : Script
{
    protected override void Build()
    {
        Goal = Bind.Object();
        On.LateUpdate(Motion.FlockChildren().Towards(Goal)
            .Within(6).Separation(0.8).AtSpeed(5));
    }
}
```

`Towards(Goal)` is required: an object in the scene, declared with
`Bind.Object()`. Its position is read every frame. The other three are
optional, each at most once and in any order:

| Clause | Meaning | Without it |
| --- | --- | --- |
| `AtSpeed(n)` | The fastest a child moves, in world units per second. | 2 |
| `Within(n)` | A child this close to the goal or closer is attracted. | No limit |
| `Separation(n)` | The distance children keep from each other. | 1 |

The first call captures the active direct children and where they are. From
then on the flock keeps each child's position itself and writes it every
frame, so a child something else moves is put back. Moving, turning or scaling
the object carries the whole flock with it, and speed, distance and range stay
in world units however the object is scaled. Only the position is written:
rotation and scale are left alone, and nothing collides.

A child farther from the goal than `Within` is not attracted: it keeps its
distance from the others and slows to a stop, and it flies to the goal again
once the goal comes back within range. The same happens while the goal's
object is inactive or destroyed.

Write the call in `On.Update` or `On.LateUpdate`, where it runs every frame.
A frame without the call ends the flock: the next call captures the children
again, as they are then. That is how you stop and restart it, with an `If`
around it or a state that places it. A child that is destroyed, deactivated or
moved to another parent leaves the flock; a child added or activated joins at
the next capture.

An object is moved by one flock call per frame. A second call on the same
object in the same frame, from any script on it, is ignored and reported once,
and so is a call in any other event.

For a swarm that circles the player, make the goal an invisible child of the
player that orbits it:

```csharp
On.Update(Transform.RotateAround(Transform.Parent.WorldPosition)
    .By(0, 144 * Time.Delta, 0).KeepRotation());
```

## A worked example

```csharp
using CodeSmile.LunyScript;

public sealed partial class Patroller : Script
{
    [Variable] public Var<Vector3> Home { get; private set; }
    [Variable] public Var<Vector3> Post { get; private set; }
    [Variable] public Number Leg { get; private set; }

    protected override void Build()
    {
        On.Ready(Home.Set(Vector3.From(0, 0, 0)),
            Post.Set(Vector3.From(10, 0, 0)));

        On.FixedUpdate(
            If(Leg == 0).Then(Motion.MoveTo(Post).AtSpeed(2)),
            If(Leg == 1).Then(Motion.MoveTo(Home).AtSpeed(2)),
            If(Body.PositionDelta.Length < 0.001).Then(Leg.Set(1 - Leg)));
    }
}
```

## What to read next

- [Follow and lead](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/follow-and-lead.html) — `Motion.Follow` and
  `Motion.Lead`: a move that lasts across frames, keeping within a range of another object.
- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — sequence
  several moves instead of switching on a number.
- [Transform](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/transform.html) — writing the pose directly.
- Generated reference:
  [`MotionFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MotionFactory.html),
  [`BodyFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.BodyFactory.html),
  [`MotionFlockBuilder`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.MotionFlockBuilder.html).
