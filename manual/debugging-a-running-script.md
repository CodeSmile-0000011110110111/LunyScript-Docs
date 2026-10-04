# Debugging a running script

A guard that runs faster while it is alert, and counts hits:

```csharp
using CodeSmile.LunyScript;

public sealed partial class GuardScript : Script
{
    protected override void Build()
    {
        Alert = Define.Flag(nameof(Alert));
        Speed = Define.Number(nameof(Speed), 2);
        Hits = Define.Number(nameof(Hits));

        On.Update(
            If(Alert.IsTrue())
                .Then(Speed.Set(6))
                .Else(Speed.Set(2)));
        Hit = Define.Message();
        On.Message(Hit, Hits.Add(1));
    }
}
```

Press Play, open **Tools > LunyScript > Debugger** and select the guard in the Hierarchy. The
window shows the guard's `On.Update` with the `If` under it, then the `If`'s condition, a Then
row and an Else row, and under those the lines `.Then(Speed.Set(6))` and `.Else(Speed.Set(2)));`.
The `If` row reads "False: ran Else" and "0.0 s", and the Else row reads Taken. Tick the `Alert`
checkbox under **Values** and press **Apply**: the window shows "Applied. Read back: true", and from
the next frame the `If` row reads "True: ran Then" with a green highlight. `Speed` shows 6.

![The Debugger window showing the Values example: running scripts, the script flow with results, ages, each condition's live reading and each block's Break toggle, Fire button and each If's Force list, and the values with their editors, Break toggles and the block that last changed each one](https://codesmile-0000011110110111.github.io/LunyScript-Docs/assets/runtime-debugger.png)

The debugger shows what a script is doing while the game runs, without stopping the game or changing
the script. It is a view of the running script, not a way to write one: the script stays C#.

## Choosing a script

**Running scripts** lists every running script by its object and script name, with a state word:
Running, Not ticking when its process mode skips process events, Component off when the component
is disabled, or Stopped after an error. Click a row to show that script.

With **Follow selection** on, which is the default, selecting a GameObject in the Hierarchy shows its
script. **Lock** keeps the shown script while you select other objects. The header names the script
and its object and shows its state, its process mode, whether `On.Ready` has run, and how many updates
it received. When a block fails, a line under the header names the block, the line it was written
on, the error, and what LunyScript did about it.

## Reading what ran

**Script flow** has one row per event and one row per block, in the order the script wrote them.
A block's row shows the text of the line it was written on; when several blocks were written on one
line, the later ones show their block type instead. A block whose parts record nothing, such as the
number a `Set` writes, starts folded; its arrow shows those parts. A sequence you declared with
`DodgeRoll = Define.Sequence(...)` is one row that reads `DodgeRoll` and starts folded, so it reads
as one line; its arrow shows its blocks, and its line is the line of the `Define.Sequence` call.

| Column | What it shows |
|---|---|
| (empty circle) | The block's breakpoint; see [Pausing when a block runs or a value changes](#pausing-when-a-block-runs-or-a-value-changes) |
| Block | The block; this column takes the width the others leave |
| Last exec. | Completed, Running for a step that continues next frame, Failed, or which branch an `If` ran |
| Age | How long ago the block last ran, such as "4.2 s" or "5.1 min" |
| Live | What a condition says about the values stored now, and the value of each of its parts |
| Line | The number of the line the block was written on |
| Fire/Force | Runs the block once, or forces an `If`'s branch |

Drag the edge of a column's header to resize it. A condition shows the `true` or `false` its `If`
recorded. A value built with a C# operator, such as `Health > 10`, has no line of its own and shows
the number of the line of the call it belongs to; the cell's tooltip says so.
**Details** adds each block's type, how many times it ran, and its place in the script.

A row that just ran is highlighted for half a second: green for an `If` that ran Then and for its
condition, and a light background for any other block. A block that runs every frame stays
highlighted.

Every result under Last exec. is the one recorded when the block ran, and the debugger runs a
block only when you press Fire, so a condition that has not run since the player moved still shows
its last result, with its age.

**Live** shows whether that result still holds. It is computed from the debugger's own copy of
the values, ten times a second, without running any block or any of your code. A condition that only
an event checks, such as one inside `On.Ready`, keeps the result it recorded then; when the values
say otherwise, its Live reading is shown in blue. Fire its `If` to record the current answer.

![The Debugger window on a script whose On.Ready If checked Charge >= 3 while Charge was 0: under Last executed its condition reads false from 5.8 seconds ago, under Live now it reads true in blue, with Charge at 3.45 and the constant 3 on the rows below it, and a condition over Time.IsPaused reads unavailable](https://codesmile-0000011110110111.github.io/LunyScript-Docs/assets/runtime-debugger-live-now.png)

A condition built from your script's variables, numbers, text, enums and spatial values, with
comparisons, `&`, `|` and `!`, has a Live reading, and so does each part of it when you unfold
its row. A condition that reads anything else, such as the object's position, the game clock, input,
the network, the other collider of a collision or a list, reads **unavailable**, and so does a
condition you wrote as your own C# class, because the debugger never runs your code to find out.
The row's tooltip says why.

Double-click a row to open its line in your code editor.

## Changing a value

**Values** lists the script's variables in three columns: the breakpoint circle, **Name**, and
**Value**, which takes the remaining width; drag the edge of the Name header to resize it. Each value
has an editor for its kind: a number field, a checkbox, a text field, three fields for a `Vector3`, two for a `Vector2`, three angles in degrees for a
`Rotation`, a colour field for a `Color`, and a list of names for an enum. Change a value and press **Apply**. The window writes
the value once and shows the value it read back, or why the write was refused, such as text longer
than the variable holds. **Revert** puts the stored value back into the editor. Applying a value
runs no block.

A synchronized value that another peer has authority over cannot be changed from this Editor; its
editor is disabled and says why.

## Running a block and forcing an If

The row of a block that acts, such as a `Set`, an `Add` or an `If`, has a **Fire** button, and an
`If` row also has a **Force** list; the rows of a condition and of a value have neither. Both act on
the running script at once, between two frames, and neither changes the script.

**Fire** runs that one block once, as its event would. Nothing sends the guard's `Hit` message yet,
so its `Hits.Add(1)` block never runs on its own: press Fire on its row, and `Hits` under **Values**
goes up by one each time. Fire on an `If` runs its condition and the branch the condition picks,
and Fire on a sequence in an event list runs each of its blocks once, in order.
A block that runs over several frames cannot be fired: a routine and its steps, a timed `Run`, a
state machine, `Choose`, a `Wait`, and every block inside them. Neither can a block of a contact
event such as `On.CollisionEnter`, which can read the other collider only a collision supplies.
Their Fire button is disabled, and its tooltip says why. A fired block that fails stops the script,
as any failure does.

**Force** makes an `If` run the branch you choose without evaluating its condition. Choose
**Forced true** in the guard's `If` row: from the next frame the row reads "True: ran Then" and
`Speed` shows 6, while `Alert` stays false, and the condition's row reads false under Live. The list shows the forced branch in amber until you
choose **Condition**, which gives the `If` its condition back. An `If` also stops being forced when
its object despawns and when Play Mode ends.

An `ElseIf` is an `If` row of its own, under the Else row of the branch before it and labelled with
the `ElseIf` line, so each condition of a chain shows its own result and has its own Force list.

## Pausing when a block runs or a value changes

The first column of **Script flow** and of **Values** holds breakpoints, as the breakpoint margin of a
code editor does. Move the pointer over a block's or a value's cell in that column and a dark red
circle shows; click it to set a breakpoint, which stays as a bright red circle, and click it again to
clear it. Set a breakpoint on the guard's `.Then(Speed.Set(6))` row, then tick `Alert` and press
**Apply**: Play Mode pauses at the end of the next frame, because that frame ran the block. The rest of
the frame still runs, including the other scripts, before Play Mode pauses.

A breakpoint on a value pauses Play Mode at the end of the frame in which the value changes. A write that
stores the value the variable already holds is not a change, so the guard's `Speed.Set(2)` running
every frame does not pause while `Speed` is already 2. Your own **Apply** does not pause either. A
value declared with `.Shared()` pauses when any script that shares it changes it.

While Play Mode is paused at a breakpoint, a red line under the header says why: which block ran, or
which value changed and which script, object and block changed it. **Show script** shows that script
when the window shows another one. Under the line, a list shows what the shown script did since the
previous pause, oldest first, with each entry's time relative to the breakpoint; the entry of the
block whose breakpoint paused is red. Double-click an entry to open its line. The line and the list
are shown only while Play Mode is paused at a breakpoint; press Play Mode's pause button to continue.

![The Debugger window paused at a breakpoint on a shared value: the red line names the value, the script and object that changed it and the line of the block that did, and the list under it shows what the shown script did before the pause](https://codesmile-0000011110110111.github.io/LunyScript-Docs/assets/runtime-debugger-breakpoint.png)

A breakpoint stays until you turn it off, its object despawns, Play Mode ends, or you close the
Debugger window. Fire on a block with a breakpoint also pauses Play Mode, because the block ran.

## Who changed a value

Under every value, a line says what changed it last and how long ago:

| Line | Meaning |
|---|---|
| Changed by this script, SetNumber at line 17 | a block of the shown script, on the line given |
| Changed by PlayerScript on Player, AddNumber at line 31 | a shared value another script changed |
| Changed by a debugger edit | your **Apply** |
| Not changed in this lifetime | the value it started with |

A value shared with `.Shared()` names whichever script and object changed it, which can be another
script on another object. A block written with a C# operator shows the line of the call it belongs
to. The Editor keeps only the last change of each value, not a history.

## The Console window

**Tools > LunyScript > Console** lists what LunyScript reported and what your
[Debug lines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/writing-to-the-console.html) wrote. Double-click a line
to open the line of your script it came from.

## What to read next

- [Flow: conditions, timed work and routines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/flow.html) — the
  `If`, Then and Else the debugger shows.
- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — the kinds of
  value the Values list edits.
- Generated reference:
  [`RunnerDiagnostics`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.RunnerDiagnostics.html),
  the diagnostics the window reads.
