/**
 * Tests for cross-module type visibility enforcement.
 *
 * Covers two areas:
 * 1. validateCallAgainstOverloads — typename parameter handling: ensures that
 *    bare type identifiers passed to typename params are checked for
 *    cross-module accessibility, with disallowed combinations producing an error.
 *
 * 2. checkUnknownSymbols — cross-module type/base-class diagnostics: ensures
 *    that using a type (or extending a base class) defined in a higher-numbered
 *    module produces a diagnostic with DiagnosticSeverity.Error (not Warning).
 */
import { Analyzer } from '../server/src/analysis/project/graph';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { File } from '../server/src/analysis/ast/parser';

/** Create a fresh Analyzer instance (bypasses singleton) */
function freshAnalyzer(): Analyzer {
    return new (Analyzer as any)();
}

/** Index a document into an analyzer and return the parsed AST */
function indexDoc(analyzer: Analyzer, code: string, uri: string): File {
    const doc = TextDocument.create(uri, 'enscript', 1, code);
    return analyzer.parseAndCache(doc);
}

/**
 * Pad the analyzer's docCache to reach `targetSize` entries using minimal
 * placeholder File objects. This satisfies internal size-guard thresholds
 * without running the full parse pipeline for every entry.
 */
function padDocCache(analyzer: Analyzer, targetSize: number): void {
    const cache: Map<string, File> = (analyzer as any).docCache;
    let i = cache.size;
    while (cache.size < targetSize) {
        cache.set(`file:///pad/${i++}.c`, { body: [], version: 1, diagnostics: [] });
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. validateCallAgainstOverloads — typename parameter
// ══════════════════════════════════════════════════════════════════════════════

describe('validateCallAgainstOverloads – typename parameter', () => {
    let analyzer: Analyzer;

    beforeAll(() => {
        analyzer = freshAnalyzer();
        // HighLevelClass lives in module 3 (3_Game)
        indexDoc(analyzer, 'class HighLevelClass {};', 'file:///3_Game/types.c');
        // LowLevelClass lives in module 1 (1_Core)
        indexDoc(analyzer, 'class LowLevelClass {};', 'file:///1_Core/low.c');
        // Function with typename param, also in module 1
        indexDoc(analyzer, 'void DoSomething(typename type) {}', 'file:///1_Core/funcs.c');
    });

    function getOverloads(name: string) {
        const overloads = (analyzer as any).functionIndex.get(name);
        expect(overloads).toBeDefined();
        return overloads;
    }

    function validate(overloads: any[], argStrings: string[], module: number) {
        const ast = { module } as File;
        return (analyzer as any).validateCallAgainstOverloads(
            overloads, [null], 1, 'DoSomething', argStrings, ast
        );
    }

    test('typename arg from the same module is allowed', () => {
        // Module 3 calling with HighLevelClass (module 3) → OK
        const result = validate(getOverloads('DoSomething'), ['HighLevelClass'], 3);
        expect(result).toBeNull();
    });

    test('typename arg from a lower-numbered module is allowed', () => {
        // Module 3 calling with LowLevelClass (module 1) → OK (1 < 3)
        const result = validate(getOverloads('DoSomething'), ['LowLevelClass'], 3);
        expect(result).toBeNull();
    });

    test('typename arg from a higher-numbered module is disallowed', () => {
        // Module 1 calling with HighLevelClass (module 3) → Error (3 > 1)
        const result = validate(getOverloads('DoSomething'), ['HighLevelClass'], 1);
        expect(result).not.toBeNull();
        expect(result!.severity).toBe('error');
        expect(result!.message).toContain('HighLevelClass');
        expect(result!.message).toContain('3_Game');
        expect(result!.message).toContain('1_Core');
    });

    test('unindexed typename arg is skipped (no error)', () => {
        // Module 1 calling with UnknownClass (not indexed anywhere) → skipped
        const result = validate(getOverloads('DoSomething'), ['UnknownClass'], 1);
        expect(result).toBeNull();
    });

    test('complex expression typename arg is skipped (no error)', () => {
        // Complex expressions (containing non-word characters) are skipped
        const result = validate(getOverloads('DoSomething'), ['GetType()'], 1);
        expect(result).toBeNull();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. checkUnknownSymbols — cross-module diagnostic severity
// ══════════════════════════════════════════════════════════════════════════════

describe('checkUnknownSymbols – cross-module diagnostics are errors', () => {
    let analyzer: Analyzer;

    beforeAll(() => {
        analyzer = freshAnalyzer();
        // HighType lives in module 3 (3_Game)
        indexDoc(analyzer, 'class HighType {};', 'file:///3_Game/high.c');
        // BaseHigh lives in module 4 (4_World) — for base class test
        indexDoc(analyzer, 'class BaseHigh {};', 'file:///4_World/base.c');
        // Pad the cache so checkUnknownSymbols' internal guard is satisfied
        padDocCache(analyzer, 500);
    });

    test('using a higher-module type in a variable declaration produces an Error diagnostic', () => {
        // Module 1 file references HighType (module 3) in a variable declaration
        const ast = indexDoc(
            analyzer,
            'class Foo { HighType m_Var; };',
            'file:///1_Core/foo.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('HighType') && d.message.includes('3_Game')
        );
        expect(crossModuleDiag).toBeDefined();
        expect(crossModuleDiag!.severity).toBe(DiagnosticSeverity.Error);
    });

    test('extending a base class from a higher-numbered module produces an Error diagnostic', () => {
        // Module 2 file extends BaseHigh (module 4)
        const ast = indexDoc(
            analyzer,
            'class MyClass extends BaseHigh {};',
            'file:///2_GameLib/myclass.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('BaseHigh') && d.message.includes('4_World')
        );
        expect(crossModuleDiag).toBeDefined();
        expect(crossModuleDiag!.severity).toBe(DiagnosticSeverity.Error);
    });

    test('using a same-module type produces no cross-module diagnostic', () => {
        // Module 3 file references HighType (also module 3) → no cross-module error
        const ast = indexDoc(
            analyzer,
            'class Bar { HighType m_Val; };',
            'file:///3_Game/bar.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('HighType') && d.message.includes('3_Game')
        );
        expect(crossModuleDiag).toBeUndefined();
    });

    test('using a lower-module type produces no cross-module diagnostic', () => {
        // Module 4 file references HighType (module 3) → 3 < 4, no error
        const ast = indexDoc(
            analyzer,
            'class Baz { HighType m_Val; };',
            'file:///4_World/baz.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('HighType') && d.message.includes('3_Game')
        );
        expect(crossModuleDiag).toBeUndefined();
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. checkUnknownSymbols — static call targets (ClassName.Method()) 
// ══════════════════════════════════════════════════════════════════════════════

describe('checkUnknownSymbols – static call cross-module diagnostics', () => {
    let analyzer: Analyzer;

    beforeAll(() => {
        analyzer = freshAnalyzer();
        // MissionMenu lives in module 5 (5_Mission)
        indexDoc(analyzer, 'class MissionMenu {};', 'file:///5_Mission/menu.c');
        // WorldHelper lives in module 4 (4_World)
        indexDoc(analyzer, 'class WorldHelper {};', 'file:///4_World/helper.c');
        // CoreUtil lives in module 1 (1_Core)
        indexDoc(analyzer, 'class CoreUtil {};', 'file:///1_Core/util.c');
        // Pad the cache so checkUnknownSymbols' internal guard is satisfied
        padDocCache(analyzer, 500);
    });

    test('static call on a higher-module class produces an Error diagnostic', () => {
        // Module 4 file calls MissionMenu.Open() — MissionMenu is in module 5
        const ast = indexDoc(
            analyzer,
            'class MyAction { void Execute() { MissionMenu.Open(); }; };',
            'file:///4_World/action.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('MissionMenu') && d.message.includes('5_Mission')
        );
        expect(crossModuleDiag).toBeDefined();
        expect(crossModuleDiag!.severity).toBe(DiagnosticSeverity.Error);
    });

    test('static call on a same-module class produces no cross-module diagnostic', () => {
        // Module 4 file calls WorldHelper.Do() — WorldHelper is also in module 4
        const ast = indexDoc(
            analyzer,
            'class MyAction2 { void Execute() { WorldHelper.Do(); }; };',
            'file:///4_World/action2.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('WorldHelper') && d.message.includes('4_World')
        );
        expect(crossModuleDiag).toBeUndefined();
    });

    test('static call on a lower-module class produces no cross-module diagnostic', () => {
        // Module 4 file calls CoreUtil.Do() — CoreUtil is in module 1 (lower)
        const ast = indexDoc(
            analyzer,
            'class MyAction3 { void Execute() { CoreUtil.Do(); }; };',
            'file:///4_World/action3.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('CoreUtil')
        );
        expect(crossModuleDiag).toBeUndefined();
    });

    test('static call in a top-level function also detects cross-module violation', () => {
        // Module 4 top-level function calls MissionMenu.Open()
        const ast = indexDoc(
            analyzer,
            'void MyFunc() { MissionMenu.Open(); };',
            'file:///4_World/func.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('MissionMenu') && d.message.includes('5_Mission')
        );
        expect(crossModuleDiag).toBeDefined();
        expect(crossModuleDiag!.severity).toBe(DiagnosticSeverity.Error);
    });

    test('chained property access on uppercase field is NOT treated as static call', () => {
        // context.Player.DoSomething() — Player is a property, not a static call
        const ast = indexDoc(
            analyzer,
            'class MyService { void Process() { context.MissionMenu.Open(); }; };',
            'file:///4_World/service.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        // MissionMenu here is accessed via context.MissionMenu — a chained property,
        // NOT a static call. Should produce no cross-module diagnostic.
        const crossModuleDiag = diags.find((d: any) =>
            d.message.includes('MissionMenu') && d.message.includes('5_Mission')
        );
        expect(crossModuleDiag).toBeUndefined();
    });

    test('uppercase variable with dot access does NOT produce unknown type warning', () => {
        // ServerURL.Length() — ServerURL is a variable, not a class
        // Should not produce any "Unknown type" warning for ServerURL
        const ast = indexDoc(
            analyzer,
            'class MyConfig { void Load() { string ServerURL = ""; int len = ServerURL.Length(); }; };',
            'file:///3_Game/config.c'
        );
        const diags: any[] = [];
        (analyzer as any).checkUnknownSymbols(ast, diags);

        const serverUrlDiag = diags.find((d: any) =>
            d.message.includes('ServerURL')
        );
        expect(serverUrlDiag).toBeUndefined();
    });
});
