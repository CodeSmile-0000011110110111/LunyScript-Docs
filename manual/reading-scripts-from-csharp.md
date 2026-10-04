# Reading scripts from C#

Show a script's variable in an ordinary `MonoBehaviour`:

```csharp
using CodeSmile.LunyScript;
using UnityEngine;

public sealed class HealthBar : MonoBehaviour
{
    [SerializeField] private LunyScriptBehaviour m_Player;
    [SerializeField] private Transform m_Bar;
    private LunyScriptReference<PlayerScript> m_Reference;
    private ScriptObservation m_Watch;

    private void Start()
    {
        m_Reference = LunyScript.Find<PlayerScript>(m_Player);
        if (m_Reference.IsRunning == false)
            return;

        var player = m_Reference.Definition;
        ShowHealth(m_Reference.Read(player.Health));
        m_Watch = m_Reference.Observe(player.Health, ShowHealth);
    }

    private void ShowHealth(double health) => m_Bar.localScale =
        new UnityEngine.Vector3((float)(health / 100), 1f, 1f);

    private void OnDestroy() => m_Watch?.Dispose();
}
```

`LunyScript.Find` looks up the script the player object runs and returns a reference to it. `Read`
returns the value `Health` holds now, and `Observe` calls `ShowHealth` again whenever that value
changes. The C# code reads; it never writes the script's variables. In the Inspector, drag the player
object onto `m_Player`, which assigns its `LunyScriptBehaviour`, and the bar object onto `m_Bar`, whose
width then follows `Health`.

## Finding a script

`LunyScript.Find<PlayerScript>(behaviour)` returns a `LunyScriptReference<PlayerScript>`. Check
`IsRunning` before you read through it:

```csharp
var enemy = LunyScript.Find<EnemyScript>(behaviour);
if (enemy.IsRunning)
    damage = enemy.Read(enemy.Definition.Damage);
```

`IsRunning` is false when the object's script is of another type, when `behaviour` is null or its
object was destroyed, before the object's `Awake`, and after the script ended. A script type derived
from the one you ask for is found too.

`LunyScript.Exists` asks the same question without keeping a reference:

```csharp
if (LunyScript.Exists<EnemyScript>(behaviour))
    enemiesInRange++;
```

From a `GameObject` or a `Collider`, reach the behaviour first:

```csharp
private void OnTriggerEnter(Collider other)
{
    if (other.TryGetComponent(out LunyScriptBehaviour behaviour))
    {
        var enemy = LunyScript.Find<EnemyScript>(behaviour);
        if (enemy.IsRunning)
            TakeDamage(enemy.Read(enemy.Definition.Damage));
    }
}
```

`TryGetComponent` finds the behaviour on the collider's own object. A collider on a child object
finds the child's behaviour, not one on its parent.

### In a namespace that starts with CodeSmile

Inside a namespace such as `CodeSmile.MyGame`, the name `LunyScript` means the namespace
`CodeSmile.LunyScript`, so `LunyScript.Find` does not compile there when `using
CodeSmile.LunyScript;` is at the top of the file. The compiler reports error CS0234. Write the full
name, or put the `using` directive inside the namespace block:

```csharp
namespace CodeSmile.MyGame
{
    using CodeSmile.LunyScript;

    public static class Lookup
    {
        public static bool HasEnemy(LunyScriptBehaviour behaviour) =>
            LunyScript.Exists<EnemyScript>(behaviour);

        public static bool HasPlayer(LunyScriptBehaviour behaviour) =>
            CodeSmile.LunyScript.LunyScript.Exists<PlayerScript>(behaviour);
    }
}
```

Code in any other namespace, and code in no namespace, writes `LunyScript.Find` with the `using`
directive at the top of the file.

## The definition and its handles

`Definition` is the script object whose `Build()` ran. Its properties hold the variable handles:
`player.Health` is the `Number` that `Build()` declared. Take the handles from the reference you read
through. A handle from another script type is refused with a `LunyScriptUsageException` that names
both types, even when both scripts declare a variable of the same name:

```csharp
reference.Read(crate.Definition.Health);  // throws: CrateScript declared Health
```

A script object you create with `new PlayerScript()` is not a definition. Its properties are
unassigned, because `Build()` runs once per script type, on the first object of that type.

## Reading a value

`Read` has one form per kind of variable, and each returns that kind:

| Variable | `Read` returns |
| --- | --- |
| `Number` | `double` |
| `Flag` | `bool` |
| `Var<Vector3>` | `Vector3` |
| `Var<Rotation>` | `Rotation` |
| `Var<Vector2>` | `Vector2` |
| `Var<YourEnum>` | `YourEnum` |
| `Text` | `string`, or a copy into your fixed string |

`Vector3` and `Vector2` in this table are LunyScript's types. A `MonoBehaviour` that imports both
`CodeSmile.LunyScript` and `UnityEngine` writes `UnityEngine.Vector3` for Unity's type, as `ShowHealth`
does above, because the compiler refuses the bare name in a file that imports both.

A text variable is read as a `string`. A text declared without a byte count returns the string it holds,
so the read allocates nothing; a text declared with a `TextCapacity` returns its characters as a new
string on each read:

```csharp
var status = reference.Read(reference.Definition.Status);
```

A fixed text can also be copied into a fixed string you provide, which allocates nothing:

```csharp
var name = new FixedString64Bytes();
reference.Read(reference.Definition.PlayerName, ref name);
```

That read returns `CopyError.Truncation`, and leaves the fixed string unchanged, when the text does
not fit, which a growing text longer than the fixed string you pass also does. `FixedString64Bytes` is in
`Unity.Collections`. The checks and the reads of numbers, flags and the other values allocate nothing, so a
HUD can check and read every frame.

## When the script ends

A reference belongs to one run of the script on one object. Two checks tell you where that run is,
and neither throws:

- **`IsRunning`** is true from the object's creation until the object is destroyed. It stays true
  while the object is deactivated and while the game is paused.
- **`IsObjectSpawned`** is true while the object is spawned or created, and false once it is
  despawned or destroyed.

When the script ends with `Object.Destroy()`, or its pooled object goes back to its pool with
`Object.Despawn()`, or its object is destroyed, or Play Mode ends, both become false and stay false.
`Object.Destroy()` destroys the object, so both change at the same moment; Unity removes the
GameObject at the end of that frame.

**A read after that throws a `LunyScriptUsageException`**, on every call, the way C# throws when you
read a destroyed Unity object or component. The message names the script, the variable and the
object, and tells you to check `IsRunning` first. `Observe` throws the same way. Check before each
read:

```csharp
private void Update()
{
    m_Bar.gameObject.SetActive(m_Reference.IsObjectSpawned);
    if (m_Reference.IsRunning)
        ShowHealth(m_Reference.Read(m_Reference.Definition.Health));
}
```

LunyScript reuses a despawned script's storage for the next object of the same script type. That
next object is a new run, and an old reference never reads it:

```csharp
var first = LunyScript.Find<GuardScript>(guardBehaviour);
// the guard despawns; the relief guard starts and reuses its storage
var relief = LunyScript.Find<GuardScript>(reliefBehaviour);
// first.IsRunning is false, and first.Read(...) throws;
// relief.IsRunning is true
```

Call `LunyScript.Find` again to reach whatever the object runs now. Two references compare equal when
they refer to the same run of a script, before and after it ends.

## Following changes

`Observe` calls your method with the new value each time the variable changes:

```csharp
m_Watch = reference.Observe(reference.Definition.Health, ShowHealth);
```

It exists for `Number`, `Flag`, `Var<Vector3>`, `Var<Rotation>` and `Var<Vector2>`.

- **It runs at most once per frame**, after every script's `On.LateUpdate`, and only when the value
  differs from the value at the previous check. It does not run for the value the variable held when
  you called `Observe`; read that with `Read`.
- **You end it with `Dispose()`**, usually in `OnDestroy`. Disposing twice does nothing.
- **It ends by itself when the script ends.** `IsActive` becomes false and your method is not called
  again.
- **It ends when your component is destroyed.** When the method you passed belongs to a
  `MonoBehaviour` or another Unity object that has been destroyed, the next check ends the
  observation instead of calling it. A lambda is not a Unity object, so dispose a lambda's
  observation yourself.
- **A method that throws is reported once.** The exception is logged as an error, that observation
  ends, and every other observation still runs.

## Reading a shared variable

C# reads a shared variable the way it reads one of the object's own: through a reference to a script
that declares or binds it. The read returns the value in the store, which every script that declares
or binds the name reads and writes.

`ScoreKeeper` declares the team's score, and each `Coin` binds it and adds 10 when the player touches
the coin:

<pre><code>public sealed partial class ScoreKeeper : Script
{
    protected override void Build()
    {
        TeamScore = Define.Number(nameof(TeamScore)).Shared();
    }
}

public sealed partial class Coin : Script
{
    protected override void Build()
    {
        TeamScore = Bind.Number(nameof(TeamScore)).Shared();

        On.TriggerEnter(If(Other.HasTag("Player"))
            .Then(TeamScore.Add(10), Object.Destroy()));
    }
}
</code></pre>

A HUD label shows the score through the object that runs `ScoreKeeper`:

<pre><code>using CodeSmile.LunyScript;
using UnityEngine;
using UnityEngine.UIElements;

public sealed class TeamScoreLabel : MonoBehaviour
{
    [SerializeField] private LunyScriptBehaviour m_ScoreKeeper;
    [SerializeField] private UIDocument m_Hud;
    private Label m_Label;
    private ScriptObservation m_Watch;

    private void Start()
    {
        m_Label = m_Hud.rootVisualElement.Q&lt;Label&gt;("team-score");
        var keeper = <strong>LunyScript.Find&lt;ScoreKeeper&gt;(m_ScoreKeeper)</strong>;
        if (<strong>keeper.IsRunning</strong> == false)
            return;

        var score = <strong>keeper.Definition.TeamScore</strong>;
        ShowScore(<strong>keeper.Read(score)</strong>);
        m_Watch = <strong>keeper.Observe(score, ShowScore)</strong>;
    }

    private void ShowScore(double score) => m_Label.text = $"Score {score}";

    private void OnDestroy() => <strong>m_Watch?.Dispose()</strong>;
}
</code></pre>

In the Inspector, drag the object that runs `ScoreKeeper` onto `m_ScoreKeeper`, which assigns its
`LunyScriptBehaviour`, and the object that holds the HUD's `UIDocument` onto `m_Hud`. The HUD's UXML
holds a `Label` named `team-score`. `Read` returns the score when the label starts. `Observe` calls
`ShowScore` once per frame in which a coin changed the score, after every script's `On.LateUpdate`.

A reference to any object whose script declares or binds the name reads the same value. With
`var coin = LunyScript.Find<Coin>(coinBehaviour);`, where `coinBehaviour` is a coin's
`LunyScriptBehaviour`, `coin.Read(coin.Definition.TeamScore)` returns the team score as well. A
reference and its observation belong to the one object you found, and end when that object's script
ends, while the value stays in the store. A coin destroys itself when the player collects it, so the
label reads through the scorekeeper, whose object stays in the scene for as long as the label shows
the score.

To change the score from C#, send a message to a script that declares or binds it, as the next
section shows.

## Changing a script's state

There is no write through a reference. To change another script's state, send it a message and let
its own `On.Message` blocks change it:

```csharp
// in the script's Build():
On.Message(nameof(Heal), Health.Add(25));

// in C#:
playerBehaviour.Send(PlayerScript.Heal);
```

`Heal` here is a `const string` the script declares, so the name is written once. The script
decides what a heal does, including any limit it applies.

## The object's own script

`LunyScriptBehaviour` also reads the variables of the script on its own object, through
`GetNumber`, `GetFlag`, `GetVector3`, `GetRotation`, `GetVector2`, `GetEnum`, `ReadText`, `GetAsset`
and `GetObject`:

```csharp
var script = (PlayerScript)behaviour.Script;
if (behaviour.IsRunning)
    health = behaviour.GetNumber(script.Health);
```

`LunyScriptBehaviour` has the same `IsRunning` and `IsObjectSpawned` checks. Its reads and `Send`
throw a `LunyScriptUsageException` before `Awake`, after the object is despawned or destroyed, and
after Play Mode ends, the same way a reference does.

## What to read next

- [Variables and values](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/variables-and-values.html) — the variables a
  reference reads.
- [Messaging](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/messaging.html) — `On.Message` and `Send`.
- [Events and object lifetime](https://codesmile-0000011110110111.github.io/LunyScript-Docs/manual/events-and-object-lifetime.html) —
  when a script despawns.
- Generated reference:
  [`LunyScript`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.LunyScript.html),
  [`LunyScriptReference<TScript>`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.LunyScriptReference-1.html),
  [`ScriptObservation`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.ScriptObservation.html),
  [`LunyScriptBehaviour`](https://codesmile-0000011110110111.github.io/LunyScript-Docs/api/reference/CodeSmile.LunyScript.LunyScriptBehaviour.html).
