// Custom C# type highlighter - post-processes after hljs runs.
// hljs colours C# keywords and its own built-in types, but leaves engine and product type names
// plain; this script gives them the .hljs-type colour that public/main.css sets per theme.
// It runs after docfx.min.js has highlighted a block, which is why it retries on a timer rather
// than running once: DocFX exposes no completion hook for its highlighting pass.

// Unity types
const unityTypes = [
    'Vector2', 'Vector3', 'Vector4', 'Vector2Int', 'Vector3Int',
    'Quaternion', 'Matrix4x4', 'Transform', 'GameObject',
    'Component', 'MonoBehaviour', 'ScriptableObject',
    'Rigidbody', 'Rigidbody2D', 'Collider', 'Collider2D',
    'BoxCollider', 'SphereCollider', 'CapsuleCollider', 'MeshCollider',
    'BoxCollider2D', 'CircleCollider2D', 'PolygonCollider2D',
    'Color', 'Color32', 'Texture', 'Texture2D', 'Material', 'Mesh',
    'Camera', 'Light', 'Canvas', 'RectTransform',
    'AudioSource', 'AudioClip', 'Sprite', 'SpriteRenderer',
    'Animator', 'Animation', 'AnimationClip',
    'Input', 'Time', 'Debug', 'Mathf', 'Random',
    'Scene', 'SceneManager', 'UnityEngine', 'UnityEditor',
    'SerializeField', 'HideInInspector', 'Range', 'Tooltip', 'Header',
    'InputAction', 'InputSystem',
    'Awake', 'OnEnable', 'OnDisable', 'Start', 'Update', 'FixedUpdate', 'LateUpdate', 'OnDestroy'
];

// LunyScript types. Regenerate this list from the built site after adding or renaming public
// types, so it does not drift from the API:
//   docfx docfx/docfx.json && python3 -c "import json;d=json.load(open('docfx/_site/toc.json'));\
//     print(sorted({t['name'].split('<')[0].split('.')[-1] for ns in d['items'][0]['items'] \
//     for t in ns.get('items',[])}))"
// A name missing from the list only means that name stays uncoloured.
const lunyScriptTypes = [
    'ActionBlock', 'ActionResult', 'ActivateObjectBlock', 'AdapterAdmission', 'AdapterRegistration',
    'AimedLookAtBuilder', 'AllocatingTextSink', 'AllocationMeasure', 'AllocationSample',
    'ApplicationObservation', 'ArithmeticOperator', 'Asset', 'AssetAttribute', 'AssetFactory', 'AssetGateway',
    'AssetInput', 'AssetInputAssignment', 'AssetLoadBlock', 'AssetLoadBuilder', 'AssetPlaceholderFactory',
    'AssetPlaceholderSource', 'AssetPlaceholders', 'AssetProvider', 'AssetReleaseBlock', 'AssetSource',
    'BindFactory', 'Block', 'BodyFactory', 'CameraFactory', 'CameraGateway', 'CameraOperationResult',
    'CameraRigBuilder', 'CameraTargetOperation', 'CameraTargetsBuilder', 'CameraTracking',
    'ChooseBiasedBuilder', 'ChooseBuilder', 'ChooseCompleteBuilder', 'ChooseHeldBuilder',
    'ChooseHighestBuilder', 'CinemachineCameraProvider', 'CloudFactory', 'CloudSaveGateway',
    'CloudWatchBuilder', 'CollectionRead', 'ComparisonOperator', 'CompilationFacts', 'ConditionBlock',
    'CreateObjectBlock', 'CursorInputFactory', 'DeactivateObjectBlock', 'DefineFactory', 'DespawnObjectBlock',
    'DiagnosticBuffer', 'DiagnosticCatalog', 'DiagnosticCommand', 'DiagnosticCommandState', 'DiagnosticFault',
    'DiagnosticIdentity', 'DiagnosticNode', 'DiagnosticProtocol', 'DiagnosticRecordKind', 'DiagnosticSnapshot',
    'DiagnosticTrace', 'DiagnosticValue', 'DiagnosticVariable', 'Easing', 'EditorScript', 'Elapsed', 'EnumSlot',
    'EnumValueBlock', 'FakeAssetLoadProvider', 'FakeCameraProvider', 'FakeHost', 'FakeInputProvider',
    'FakeNetworkProvider', 'FileCloudSaveProvider', 'Flag', 'FlagBindBuilder', 'FlagDefineBuilder', 'FlagSlot',
    'FlagValueBlock', 'ForEachListBuilder', 'ForEachMapBuilder', 'GameClockRules', 'GameObjectHost',
    'GateCategory', 'GateFactory', 'IAssetLoadOperation', 'IAssetLoadProvider', 'IAsyncOperation',
    'ICameraProvider', 'ICloudLoadOperation', 'ICloudSaveProvider', 'IDocumentCodec', 'IGameClock',
    'IInputActionHandle', 'IInputProvider', 'INetworkProvider', 'IPackageVersionSource', 'IRandomSource',
    'IScriptAssetInputs', 'IScriptHost', 'IScriptHostCapabilities', 'IScriptNode', 'IScriptObjectLifetime',
    'IScriptObjectSpawner', 'IScriptTrackingTarget', 'ITextSink', 'ITimeSource', 'IfBuilder', 'IfThenBuilder',
    'InputActionResolution', 'InputButton', 'InputFactory', 'InputGateway', 'InputNumber', 'InputPhase',
    'InputRebindBuilder', 'InputRebindPoll', 'InputRebindStart', 'InputSystemProvider', 'InputValueKind',
    'InputVector2', 'InputVector3', 'InputWatchBuilder', 'InstanceLayout', 'LifetimeRequest',
    'ListDefineBuilder', 'ListHandle', 'LookAtBuilder', 'LunyScriptBehaviour', 'LunyScriptContactBehaviour',
    'LunyScriptContractException', 'LunyScriptDriverBehaviour', 'LunyScriptException',
    'LunyScriptInternalException', 'LunyScriptLog', 'LunyScriptLogAreas', 'LunyScriptLogRecord',
    'LunyScriptLogSeverity', 'LunyScriptNetworkBehaviour', 'LunyScriptRuntime', 'LunyScriptUsageException',
    'ManualTimeSource', 'MapDefineBuilder', 'MapHandle', 'MathFactory', 'MotionDisplacementBuilder',
    'MotionFaceTowardsBuilder', 'MotionFaceTowardsRatedBuilder', 'MotionFactory', 'MotionForceBuilder',
    'MotionMechanism', 'MotionMoveToAtSpeedBuilder', 'MotionMoveToBuilder', 'MotionMoveToDurationBuilder',
    'MotionMoveToTimedBuilder', 'MotionRotateToBuilder', 'MotionRotateToDurationBuilder',
    'MotionRotateToRatedBuilder', 'MotionRotateToTimedBuilder',
    'MotionTeleportBuilder', 'MotionTeleportOrientedBuilder', 'MotionVelocityBuilder', 'NetFactory',
    'NetSendFactory', 'NetworkGateway', 'NetworkMessage', 'NetworkProviderConformance', 'NetworkValue',
    'NetworkValueKind', 'NetworkVariableUpdate', 'NgoNetworkProvider', 'NodeDescription', 'Number',
    'NumberBindBuilder', 'NumberDefineBuilder', 'NumberFunction', 'NumberSlot', 'NumberState',
    'NumberValueBlock', 'ObjectLifetimeFactory', 'OnApplicationFactory', 'OnAuthorityFactory',
    'OnEditorFactory', 'OnFactory', 'Operation', 'OperationFactory', 'OperationFailure',
    'OperationWatchBuilder', 'OrbitPointBuilder', 'OrbitRotationBuilder', 'OtherFactory', 'PlayerInputFactory',
    'PlayerTestHeartbeat', 'PlayerTestHeartbeatRecord', 'Prefab', 'Process', 'ProcessOverride',
    'RandomChoiceBuilder', 'RandomChoiceFromBuilder', 'RandomFactory', 'RandomIndexBuilder',
    'RandomIndexCountBuilder', 'RandomIndexFromBuilder', 'RandomNumberBuilder', 'RandomNumberFromBuilder',
    'RandomNumberRangeBuilder', 'RandomStream', 'RandomStreamSlot', 'RandomWeightedBuilder',
    'RandomWeightedFromBuilder', 'RandomWeightedWeightsBuilder', 'ReleaseGate', 'ReparentBuilder',
    'ResourcesAssetLoadProvider', 'Rotation', 'RotationSlot', 'RotationUnary', 'RotationValueBlock',
    'RoundingMode', 'RoutineBuilder', 'RoutineGroupBuilder', 'RoutineGroupEndingBuilder',
    'RoutineGroupSurvivorBuilder', 'RunCadenceBuilder', 'RunEveryAmountBuilder', 'RunForAmountBuilder',
    'RunHandle', 'RunOverAmountBuilder', 'RunWorkBuilder', 'RunnerDiagnostics', 'RuntimeReport', 'Script', 'ScriptBase',
    'ScriptBuildContext', 'ScriptContexts', 'ScriptInstance', 'ScriptProgram', 'ScriptRunner', 'ScriptServices',
    'SessionState', 'SharedFactory', 'SharedStore', 'SlotKind', 'SourceLocation',
    'SpacedMotionDisplacementBuilder', 'SpacedMotionForceBuilder', 'SpacedMotionVelocityBuilder',
    'SpacedTransformOffsetBuilder', 'SpawnBuilder', 'SpawnFramedBuilder', 'SpawnObjectBlock',
    'SpawnPlacedBuilder', 'SpawnPlacement', 'SpawnRequest', 'StaticsGateControl', 'StaticsGateProbe',
    'SyncCadence', 'SyncDeclaration', 'SyncFactory', 'SyncKind', 'TargetGroupEntry', 'TestGroups', 'Text',
    'TextArgument', 'TextArgumentKind', 'TextCapacities', 'TextCapacity', 'TextDefineBuilder', 'TextFormat',
    'TextLength', 'TextLengths', 'TextSlot', 'TimeFactory', 'TimeReadBlock', 'TransformAxis',
    'TransformChannel', 'TransformFactory', 'TransformOffsetBuilder', 'TransformPart', 'TransformRelation',
    'TransformSpace', 'TransformStreamInbox', 'TransformSyncDeclaration', 'TransformTargetFactory',
    'TransformToBuilder', 'TransformToDurationBuilder', 'UgsCloudSaveProvider', 'UnityTimeSource', 'UtilityOption', 'UtilityOptionBuilder',
    'Var', 'VarFactory', 'VarWatchBuilder', 'VariableAttribute', 'Vec2', 'Vec2Arithmetic', 'Vec2Component',
    'Vec2Scalar', 'Vec2Slot', 'Vec2Unary', 'Vec2ValueBlock', 'Vec3', 'Vec3Arithmetic', 'Vec3Component',
    'Vec3Scalar', 'Vec3Slot', 'Vec3Unary', 'Vec3ValueBlock', 'ViewBuilder', 'ViewFactory', 'WhenFactory',
    'XorshiftRandomSource'
];

const customTypes = [...new Set([...unityTypes, ...lunyScriptTypes])];
customTypes.sort((a, b) => b.length - a.length);

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create regex pattern for all custom types
const typePattern = new RegExp('\\b(' + customTypes.map(escapeRegex).join('|') + ')\\b', 'g');

const processedBlocks = new WeakSet();

function highlightCustomTypes(codeBlock) {
    if (processedBlocks.has(codeBlock)) {
        return;
    }

    processedBlocks.add(codeBlock);

    // Get the HTML content
    let html = codeBlock.innerHTML;

    // Replace custom type names with highlighted versions
    // We need to avoid replacing inside existing spans or HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (typePattern.test(text)) {
                const span = document.createElement('span');
                span.innerHTML = text.replace(typePattern, '<span class="hljs-type">$1</span>');
                node.parentNode.replaceChild(span, node);

                // Unwrap the temporary span
                while (span.firstChild) {
                    span.parentNode.insertBefore(span.firstChild, span);
                }
                span.parentNode.removeChild(span);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SPAN') {
            Array.from(node.childNodes).forEach(processNode);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
            // Don't recurse into spans, but check if this span's text matches entirely
            if (node.childNodes.length === 1 && node.firstChild.nodeType === Node.TEXT_NODE) {
                const text = node.firstChild.textContent;
                if (customTypes.includes(text)) {
                    node.className = 'hljs-type';
                }
            }
        }
    }

    Array.from(tempDiv.childNodes).forEach(processNode);
    codeBlock.innerHTML = tempDiv.innerHTML;
}

function processAllCodeBlocks() {
    const codeBlocks = document.querySelectorAll('pre code.lang-csharp, pre code.language-csharp');

    codeBlocks.forEach(block => {
        // Only process if hljs has already highlighted it
        if (block.classList.contains('hljs')) {
            highlightCustomTypes(block);
        }
    });
}

// Try processing immediately
setTimeout(processAllCodeBlocks, 100);
setTimeout(processAllCodeBlocks, 500);
setTimeout(processAllCodeBlocks, 1000);
setTimeout(processAllCodeBlocks, 2000);
