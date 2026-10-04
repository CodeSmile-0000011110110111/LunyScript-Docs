# Transform

Move, turn and scale an object by writing its transform directly:

```csharp
using CodeSmile.LunyScript;

public sealed class Turntable : Script
{
    protected override void Build()
    {
        On.Ready(Transform.SetWorldPosition(0, 1.25, 0));
        On.Update(
            Transform.RotateBy(0, 90 * Time.Delta, 0).InWorldSpace());
    }
}
```

The object sits at one metre and a quarter above the origin and turns 90 degrees per second.

## What Transform is for

`Transform` writes the pose now, in the event it is called from, with no physics involved. Use it for
anything whose position you decide yourself: a camera mount, a turntable, a UI marker, a spawn point,
a piece of scenery that animates on a fixed path.

An object with a Rigidbody or a CharacterController needs
[Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) instead, which routes the same intent through
whichever component the object actually has. On an object with a Rigidbody, Transform's position
and rotation writes are refused; [the next section](#an-object-with-a-rigidbody) lists the Motion
call to use for each.

## An object with a Rigidbody

Transform does not write the position or the rotation of an object that has a Rigidbody,
kinematic or dynamic. The write changes nothing, the Console shows one error for that line, which
names the Motion call to use, and the rest of the event still runs:

```csharp
// Crate has a kinematic Rigidbody.
On.FixedUpdate(Transform.MoveBy(0, 0, 0.1)); // refused: Crate stays put
On.FixedUpdate(Motion.MoveBy(0, 0, 0.1));    // moves Crate
```

Writing the Transform call in `On.FixedUpdate` does not change the answer. Use the Motion call
from this table instead, in `On.FixedUpdate`:

| Refused Transform call | Kinematic Rigidbody | Dynamic Rigidbody |
| --- | --- | --- |
| `MoveBy` | `Motion.MoveBy` | `Motion.AddForce`, `Motion.AddImpulse` or `Motion.SetVelocity` to push it, `Motion.TeleportTo` to place it |
| `MoveTo(..).Over(..)` | `Motion.MoveTo(point).Over(seconds)` | as for `MoveBy` |
| `SetWorldPosition`, `SetLocalPosition` | `Motion.TeleportTo` to place it, `Motion.MoveTo(point).AtSpeed(speed)` to move it there | as for `MoveBy` |
| `RotateAround` | `Motion.MoveTo(point).AtSpeed(speed)` toward each next point of the orbit | as for `MoveBy` |
| `RotateTo(..).Over(..)` | `Motion.RotateTo(rotation).Over(seconds)` | `Motion.TeleportTo(Transform.WorldPosition).WithRotation(rotation)` to set it, or `Body.MakeKinematic()` and then `Motion.RotateTo` |
| `SetWorldRotation`, `SetLocalRotation`, `RotateBy` | `Motion.RotateTo(rotation).DegreesPerSecond(speed)` to turn it, `Motion.TeleportTo(Transform.WorldPosition).WithRotation(rotation)` to set it | as for `RotateTo` |
| `LookAt` | `Motion.FaceTowards(point).DegreesPerSecond(speed)` | as for `RotateTo` |

`Motion.TeleportTo` and `Motion.MoveTo` take a world position, so a local position becomes a world
one first. A `RotateBy` becomes the `Rotation` it would end at, which
[Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) explains how to
build.

- **The object written is the one checked.** A child with a Rigidbody refuses
  `Transform.Child(0).SetLocalPosition(...)`, and so do a parent and a root that have one. Motion
  moves only the object its own script runs on, so give that object a script with the Motion call.
  A Rigidbody on the script's own object does not refuse a write to a child that has none.
- **A Rigidbody beside a CharacterController refuses too.** Motion moves that object through its
  CharacterController, from any event, with the kinematic column's calls.
- **Scale and the hierarchy are not refused.** `SetScale`, `ScaleBy`, `ScaleTo`, `SetParent`,
  `Unparent` and every read work on an object with a Rigidbody.
- **A timed move that is refused stops where it is.** A `MoveTo` or `RotateTo` that meets a
  Rigidbody part way ends there, and its next run on an object without one starts again from that
  pose.
- **The body is checked at every write.** The error appears once per script type and line, and
  again when `Body.MakeKinematic()` or `Body.MakeDynamic()` changed the body, naming that body's
  calls.
- **A project can turn the refusal off.** Edit, Project Settings, LunyScript, **Turn off physics
  command checks** lets these writes through, and the page lists what that was measured to cause,
  such as a write lost to the body's interpolation or an object carried through a wall.

## One Vector3 or three numbers

Every verb on this page that takes three numbers also takes one `Vector3`:

```csharp
Transform.SetWorldPosition(0, 1.25, 0);
Transform.SetWorldPosition(Spawn);             // a Vector3 variable
Transform.SetWorldPosition(new Vector3(0, 1.25, 0));
```

The two forms write the same pose. A `Vector3` that holds a rotation holds degrees about the X, Y
and Z axes, in the order `Rotation.ToEuler()` returns them. A `Vector2` is not accepted, because
nothing says which of the three axes it would leave out.

## Moving by an amount

```csharp
Transform.MoveBy(0.02, 0, 0);                 // the object's own axes
Transform.MoveBy(0.02, 0, 0).InWorldSpace();  // the world axes
Transform.RotateBy(0, 1, 0).InLocalSpace();   // degrees, in the parent frame
Transform.ScaleBy(1.1);                       // one factor on all three axes
Transform.ScaleBy(1.1, 1, 1);                 // one factor per axis
Transform.MoveBy(Step);                       // Step, Spin and Stretch are
Transform.RotateBy(Spin).InWorldSpace();      // Vector3 variables
Transform.ScaleBy(Stretch);
```

`MoveBy` and `RotateBy` default to the object's own oriented axes. Add `InWorldSpace()` or
`InLocalSpace()` to pick another frame; a second space clause on one call does not compile. `ScaleBy`
takes no frame, because scale is always local.

## Moving to a value over time

```csharp
Transform.MoveTo(4, 0, 0).Over(2);
Transform.RotateTo(0, 180, 0).Over(1.5);
Transform.ScaleTo(2).Over(500).Milliseconds();
Transform.ScaleTo(2, 1, 2).Over(0.5).Seconds();
Transform.MoveTo(Home).Over(2);               // a Vector3 destination
```

`Over(amount)` is required; the chain is incomplete without it. The amount is seconds unless a unit
call follows: `Over(2)` and `Over(2).Seconds()` are the same, and `Milliseconds()`, `Minutes()` and
`Hours()` name the other units. These three interpolate the pose over the duration you give and
remain transform writes throughout. A destination that changes while
one is under way takes effect when it ends: the object arrives where that interpolation was headed,
and its next run starts a new one from there toward the new destination.

## Facing a point, and orbiting one

```csharp
Transform.LookAt(0, 1, 0);
Transform.LookAt(0, 1, 0).WithUp(0, 0, -1);
Transform.LookAt(Target).WithUp(Up);

Transform.RotateAround(0, 0, 0).By(0, 45 * Time.Delta, 0).KeepRotation();
Transform.RotateAround(0, 0, 0).By(0, 45 * Time.Delta, 0).RotateWithOrbit();
Transform.RotateAround(Pivot).By(Spin).KeepRotation();
```

`LookAt` uses world up unless `WithUp` names another direction. `RotateAround` is incomplete until
`By` and then one of the two terminal clauses: `KeepRotation()` moves the position around the pivot
and leaves the orientation as it was, and `RotateWithOrbit()` turns the object by the same amount it
travelled.

## Writing an absolute pose

```csharp
Transform.SetWorldPosition(0, 1.25, 0);
Transform.SetLocalPosition(Probe);
Transform.SetWorldRotation(0, 90, 0);
Transform.SetLocalRotation(Heading);
Transform.SetScale(1.5);
Transform.SetScale(1, 2, 1);
```

World and local are separate calls rather than one call with a frame clause, because the numbers you
pass mean a different thing in each.

## Reading the pose

Every read returns one component, as a number:

```csharp
X.Set(Transform.WorldPositionX);       // also WorldPositionY, WorldPositionZ
LocalY.Set(Transform.LocalPositionY);  // also LocalPositionX, LocalPositionZ
Yaw.Set(Transform.WorldRotationY);     // Euler degrees; also LocalRotation*
Wide.Set(Transform.ScaleX);            // local scale; WorldScaleX is world
Children.Set(Transform.ChildCount);
If(Transform.HasParent).Then(Attached.Set(true));
```

## The hierarchy

`Transform.Parent`, `Transform.Root` and `Transform.Child(index)` return a surface carrying the same
verbs and reads, aimed at that object:

```csharp
On.Update(
    Transform.Child(0).SetScale(1, Math.Max(0.03, Charge / 25), 1),
    Transform.Child(1).SetLocalPosition(Probe),
    If(Transform.HasParent).Then(Height.Set(Transform.Parent.WorldPositionY)));
```

Those three surfaces carry the verbs and the reads, and no further navigation of their own, so each
step into the hierarchy starts from `Transform`.

Reading `Transform.Parent` on an object that has no parent throws `LunyScriptUsageException` when the
block runs, so guard it with `If(Transform.HasParent)`. `Child(index)` takes a number expression and
throws if no child sits at the rounded index, naming the index and the child count.

## Reparenting

```csharp
Transform.SetParent(Transform.Root);
Transform.SetParent(Transform.Root).KeepLocal();
Transform.Unparent();
Transform.Unparent().KeepLocal();
```

By default the object keeps its world pose across the change, so it stays where it looked. Add
`KeepLocal()` to keep the local pose instead, which moves the object into the new parent's frame.
Parenting an object under itself or under one of its own descendants throws
`LunyScriptUsageException`.

## What to read next

- [Motion](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/motion.html) — the same intents on an object that has a
  Rigidbody or a CharacterController.
- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — the `Vector3` and
  `Rotation` values these calls consume.
- Generated reference:
  [`TransformFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.TransformFactory.html),
  [`TransformTargetFactory`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.TransformTargetFactory.html).
