# Drawing a script as a graph

A door that opens once the player has the key:

<pre><code>using CodeSmile.LunyScript;

public sealed partial class DoorScript : Script
{
    protected override void Build()
    {
        HasKey = Define.Flag(nameof(HasKey));
        Opening = Define.Number(nameof(Opening));

        (Door, Closed, Open) = Define.StateMachine(nameof(Door))
            .WithStates(nameof(Closed), nameof(Open));
        Door.Initial(Closed);
        Door.State(Open).Enter(Opening.Set(1));
        Door.From(Closed).To(Open).When(HasKey);

        On.Ready(Door.Start());
    }
}
</code></pre>

Select a GameObject whose LunyScript Behaviour runs `DoorScript` and press **Visualize** next to
**Edit** in its **Script To Run** row. The **LunyScript Graph** window opens with two images:

- `DoorScript: lifecycle` shows `On.Ready` and the `StateMachineStart` block that `Door.Start()`
  placed in it.
- `DoorScript: state machine Door` shows the states `Closed` and `Open`, an arrow from a start
  point to `Closed`, the `Enter` block of `Open`, and one edge from `Closed` to `Open` labelled
  `1. When FlagTruth(FlagVar)`.

The images are drawn from the script as LunyScript built it, so they show what the script will
run, in the order it runs it. The window shows images only: it runs no block and changes nothing.
To watch a script while it runs, use the
[Debugger window](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/debugging-a-running-script.html).

## What each graph shows

A script gets one lifecycle graph, then one graph per state machine and one per behaviour tree, in
the order `Build()` declared them. A script that declares no block gets none, and the window says
so.

Every node names its block type without the `Block` suffix, such as `If` or `SetNumber`, and the
number of the line it was written on. The first node of each line also shows the text of that line.
A condition or a value is written inside the node that reads it, such as
`Condition: NumberComparison(NumberVar, NumberConstant)`, instead of being drawn as a node of its
own. A sequence declared with `Define.Sequence` shows its name.

| Graph | What it shows |
|---|---|
| Lifecycle | One box per event, such as `On.Ready` or `On.Update`, and for watches, messages, requests and event handlers. Bold edges labelled `next` join blocks that run one after another; an edge labelled `ThenBlocks` or `ElseBlocks` leads to the blocks an `If` holds |
| State machine | One node per state, listing the first four blocks of its `Enter`, `Update` and `Exit`, with a double border on the initial state. One edge per transition, numbered in the order a pass reads them, with its condition and its `Do` blocks. A transition written `To(state)` starts at an `Any state` node, and one written `State(s).When(...)` is a dashed loop on its state |
| Behaviour tree | The tree from its name down. `InOrder`, `InAnyOrder` and `InParallel` are blue boxes and the wrappers `Repeat`, `Inverted` and `Always` are purple boxes, each with its ending clause or mode. A `Task` is a green box naming its action and a `Check` is a yellow ellipse naming its condition. Child edges are numbered in the order the composite advances them |

In Play Mode, **Visualize** draws the program the selected object is running. Outside Play Mode it
runs the script's `Build()` once in the Editor and spawns nothing. Both give the same graphs,
because LunyScript builds a script type once and every object running it shares that build. When
`Build()` throws, the window shows the error instead of a graph.

## Installing Graphviz

The images are drawn by the `dot` program of [Graphviz](https://graphviz.org/download/), which
LunyScript does not include. Install it once per machine:

- Windows: the Graphviz installer from the download page.
- macOS: `brew install graphviz`.
- Linux: your distribution's `graphviz` package.

**Visualize** looks for `dot` on the `PATH` the Unity Editor was started with, then in
`Program Files\Graphviz\bin` on Windows, and in `/opt/homebrew/bin`, `/usr/local/bin`,
`/opt/local/bin`, `/usr/bin` and `/snap/bin` on macOS and Linux. Without it, the window says where
to get Graphviz and shows each graph's DOT text, which any Graphviz tool draws.

## Where the images are kept

The images are written to `Library/LunyScript/ScriptGraphs/` in your project, one PNG file and one
DOT file per graph. Each file name holds the script, the graph and a key computed from the graph's
DOT text.

Press **Visualize** again on a script you have not changed and the window opens the image already
on disk without running Graphviz; each graph says it is unchanged since it was last rendered.
Change the script so that a graph shows something different, such as another block in a state's
`Exit`, and that graph is drawn again and its earlier image is deleted. A change a graph does not
show, such as a different number in a comparison, keeps its image. The folder is safe to delete at any time: Unity does not import it, and
version control ignores `Library/`.

## What to read next

- [State machines](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/state-machines.html) — the states, transitions
  and lists the state machine graph draws.
- [Behaviour trees](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/behaviour-trees.html) — the composites, wrappers,
  tasks and checks the behaviour tree graph draws.
- [Debugging a running script](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/debugging-a-running-script.html) —
  which blocks ran and what each value holds while the game runs.
