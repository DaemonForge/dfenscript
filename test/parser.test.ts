import { parse } from '../server/src/analysis/ast/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'node:url';

const CURRENT_DIR = "P:\\enscript\\test";

test('parses class declaration', () => {
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, 'class Foo { };');
    const ast = parse(doc);
    expect(ast.body[0]).toHaveProperty('kind', 'ClassDecl');
});

test('detects foreach local variables', () => {
    const code = `class Foo {
    void DoStuff() {
        array<PlayerBase> players;
        foreach (PlayerBase player : players) {
            player.DoSomething();
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    // Should detect: players (from 'array<PlayerBase> players;') and player (from foreach)
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('players');
    expect(localNames).toContain('player');
    const playerLocal = func.locals.find((l: any) => l.name === 'player');
    expect(playerLocal.type.identifier).toBe('PlayerBase');
});

test('detects auto-typed local variables', () => {
    const code = `class Foo {
    void Bar() {
        auto x = GetSomething();
        int y = 5;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('x');
    expect(localNames).toContain('y');
    const autoLocal = func.locals.find((l: any) => l.name === 'x');
    expect(autoLocal.type.identifier).toBe('auto');
});

test('detects two-variable foreach locals', () => {
    const code = `class Foo {
    void Bar() {
        map<string, int> m;
        foreach (string key, int val : m) {
            Print(key);
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('m');
    expect(localNames).toContain('key');
    expect(localNames).toContain('val');
});

test('detects comma-separated local variable declarations', () => {
    const code = `class Foo {
    void Bar() {
        float textX, textY;
        int a, b, c;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    // All comma-separated variables should be detected
    expect(localNames).toContain('textX');
    expect(localNames).toContain('textY');
    expect(localNames).toContain('a');
    expect(localNames).toContain('b');
    expect(localNames).toContain('c');
    // All should have the correct type
    expect(func.locals.find((l: any) => l.name === 'textY').type.identifier).toBe('float');
    expect(func.locals.find((l: any) => l.name === 'b').type.identifier).toBe('int');
    expect(func.locals.find((l: any) => l.name === 'c').type.identifier).toBe('int');
});

test('detects constructor-style local variable declarations', () => {
    const code = `class Foo {
    void Bar() {
        ScriptInputUserData serializer();
        int x = 5;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('serializer');
    expect(localNames).toContain('x');
    const serializerLocal = func.locals.find((l: any) => l.name === 'serializer');
    expect(serializerLocal.type.identifier).toBe('ScriptInputUserData');
});

test('comma chain does not leak across statements', () => {
    // After `int a, b;` the comma chain must reset on `;`.
    // The next statement `Foo(x, y);` must NOT treat y as a local.
    const code = `class Foo {
    void Bar() {
        int a, b;
        Foo(x, y);
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('a');
    expect(localNames).toContain('b');
    // y must NOT be mistakenly detected as a local from a stale comma chain
    expect(localNames).not.toContain('y');
    expect(localNames).not.toContain('x');
});

test('comma chain does not leak across brace boundaries', () => {
    // The comma chain must be cleared when entering/exiting a brace scope
    const code = `class Foo {
    void Bar() {
        int a, b;
        if (true) {
            SomeFunc(c, d);
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('a');
    expect(localNames).toContain('b');
    expect(localNames).not.toContain('c');
    expect(localNames).not.toContain('d');
});

test('comma-separated with first var initialized', () => {
    // `int a, b = 5;` — a is detected (Type Name ,), b follows via comma chain
    const code = `class Foo {
    void Bar() {
        int a, b = 5;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('a');
    expect(localNames).toContain('b');
    expect(func.locals.find((l: any) => l.name === 'b').type.identifier).toBe('int');
});

test('comma chain resets after equals trigger', () => {
    // After `int x = 0;` the comma chain must be null.
    // A subsequent `Func(a, b);` must NOT detect b as a local.
    const code = `class Foo {
    void Bar() {
        int x = 0;
        Func(a, b);
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('x');
    expect(localNames).not.toContain('a');
    expect(localNames).not.toContain('b');
});

test('does not false-positive on case labels', () => {
    const code = `class Foo {
    void Bar() {
        switch (x) {
            case 0:
                break;
            case MyEnum.VALUE:
                break;
            default:
                break;
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    // Should NOT detect any local variables (no valid declarations)
    expect(func.locals.length).toBe(0);
});

// ── Phase 3: scopeEnd tests ────────────────────────────────────────────

test('scopeEnd is set for locals in nested blocks', () => {
    const code = `class Foo {
    void Bar() {
        int outer = 1;
        if (true) {
            int inner = 2;
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.locals.length).toBe(2);

    const outerLocal = func.locals.find((l: any) => l.name === 'outer');
    const innerLocal = func.locals.find((l: any) => l.name === 'inner');
    expect(outerLocal).toBeDefined();
    expect(innerLocal).toBeDefined();

    // outer is in the function body scope — its scopeEnd is the function's closing '}'
    expect(outerLocal.scopeEnd).toBeDefined();
    // inner is in the if-block scope — its scopeEnd is the if-block's closing '}'
    expect(innerLocal.scopeEnd).toBeDefined();

    // inner's scope should end BEFORE outer's scope
    // (inner ends at the if-block '}', outer ends at the function '}')
    expect(innerLocal.scopeEnd.line).toBeLessThan(outerLocal.scopeEnd.line);
});

test('scopeEnd for loop variables is function scope', () => {
    // for-loop variables are declared before the '{', so they belong
    // to the parent (function body) scope, not the loop block scope.
    const code = `class Foo {
    void Bar() {
        for (int j = 0; j < 10; j++) {
            int inside = 1;
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;

    const jLocal = func.locals.find((l: any) => l.name === 'j');
    const insideLocal = func.locals.find((l: any) => l.name === 'inside');
    expect(jLocal).toBeDefined();
    expect(insideLocal).toBeDefined();

    // j is in the function body scope (declared before the for-loop '{')
    // inside is in the for-loop block scope
    // So j.scopeEnd should be >= insideLocal.scopeEnd
    expect(jLocal.scopeEnd.line).toBeGreaterThanOrEqual(insideLocal.scopeEnd.line);
});

test('scopeEnd allows sibling-block variables with same name', () => {
    // Variables in sibling (non-overlapping) blocks have separate scopes
    const code = `class Foo {
    void Bar() {
        if (true) {
            int x = 1;
        }
        if (true) {
            int x = 2;
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;

    // Both 'x' locals should exist
    const xLocals = func.locals.filter((l: any) => l.name === 'x');
    expect(xLocals.length).toBe(2);

    // Their scopes should NOT overlap: first x's scopeEnd < second x's start
    const first = xLocals[0];
    const second = xLocals[1];
    expect(first.scopeEnd.line).toBeLessThanOrEqual(second.start.line);
});

test('comparison operators do not false-positive as generic types', () => {
    // Bug: `tier.radius > maxSafeRadius;` walked back to `<` in `i < tierCount`,
    // creating a false local with type='i'. The angle bracket walk-back must stop
    // at statement boundaries (`;`, `{`, `}`).
    const code = `class Foo {
    void Bar() {
        int tierCount = 10;
        for (int i = 0; i < tierCount; i++) {
            float radius = 50.0;
            float maxSafe = 100.0;
            bool wouldOverlap = radius > maxSafe;
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;

    // Should detect: tierCount, i, radius, maxSafe, wouldOverlap
    const localNames = func.locals.map((l: any) => l.name);
    expect(localNames).toContain('tierCount');
    expect(localNames).toContain('i');
    expect(localNames).toContain('radius');
    expect(localNames).toContain('maxSafe');
    expect(localNames).toContain('wouldOverlap');

    // MUST NOT have 'maxSafe' with type='i' (the false positive)
    // All locals with name 'maxSafe' should have type 'float', never 'i'
    const maxSafeLocals = func.locals.filter((l: any) => l.name === 'maxSafe');
    for (const loc of maxSafeLocals) {
        expect(loc.type.identifier).toBe('float');
    }

    // The 'i' local should have type 'int'
    const iLocal = func.locals.find((l: any) => l.name === 'i');
    expect(iLocal.type.identifier).toBe('int');

    // Should NOT have any false locals with type='i' and name='maxSafe'
    const falseLocals = func.locals.filter((l: any) => l.type.identifier === 'i');
    expect(falseLocals.length).toBe(0);
});

test('comparison > across functions does not false-positive', () => {
    // Bug: `return currentCount > maxTerritories;` in one method walked back
    // across function boundaries to find `<` in `currentCount < maxTerritories`
    // in a previous method, falsely detecting type='currentCount'.
    const code = `class Foo {
    bool MethodA(string arg) {
        int currentCount = 5;
        bool canClaim = currentCount < 10;
        return canClaim;
    }
    bool MethodB(string arg) {
        int currentCount = 5;
        return currentCount > 10;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;

    const methodA = cls.members.find((m: any) => m.name === 'MethodA');
    const methodB = cls.members.find((m: any) => m.name === 'MethodB');

    // MethodA locals: currentCount (int), canClaim (bool)
    expect(methodA.locals.map((l: any) => l.name)).toEqual(
        expect.arrayContaining(['currentCount', 'canClaim'])
    );

    // MethodB locals: currentCount (int) only — NO false locals
    const methodBNames = methodB.locals.map((l: any) => l.name);
    expect(methodBNames).toContain('currentCount');
    // Should NOT have a false local with type='currentCount'
    const falseLocals = methodB.locals.filter((l: any) => l.type.identifier === 'currentCount');
    expect(falseLocals.length).toBe(0);
});

test('multi-line string detection moved to runDiagnostics', () => {
    // Multi-line string detection was moved from the parser to Analyzer.runDiagnostics()
    // so it works even when the parser throws a ParseError.
    // The parser itself should NOT produce multi-line string diagnostics anymore.
    const code = 'class Foo {\n    void Bar() {\n        string s = "hello\nworld";\n    }\n};';
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const mlDiag = ast.diagnostics.find(d => d.message.includes('Multi-line string'));
    expect(mlDiag).toBeUndefined();
});

test('no false positive for single-line strings', () => {
    const code = 'class Foo {\n    void Bar() {\n        string s = "hello" + " " + "world";\n    }\n};';
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    // Should NOT have a multi-line string diagnostic
    const mlDiag = ast.diagnostics.find(d => d.message.includes('Multi-line string'));
    expect(mlDiag).toBeUndefined();
});

test('reports semicolons used between enum members', () => {
    const code = `enum NotificationsRPC
{
    NOTIFICATIONS_RPC_CONFIG = 1353998362;
}`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);

    expect(ast.body[0]).toHaveProperty('kind', 'EnumDecl');

    const enumSeparatorDiag = ast.diagnostics.find(d =>
        d.message.includes('Enum members must be separated by commas')
    );

    expect(enumSeparatorDiag).toBeDefined();
    expect(enumSeparatorDiag?.severity).toBeDefined();
});

// ── Enum separator edge-case tests (false-positive / false-negative) ──────

test('no false positive: normal comma-separated enum', () => {
    const code = `enum EColor { RED, GREEN, BLUE };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.kind).toBe('EnumDecl');
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['RED', 'GREEN', 'BLUE']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: enum with assigned numeric values', () => {
    const code = `enum ERPCs { RPC_ONE = 1000, RPC_TWO = 2000, RPC_THREE = 3000 };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['RPC_ONE', 'RPC_TWO', 'RPC_THREE']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: single enum member without trailing comma', () => {
    const code = `enum ESingle { ONLY_ONE };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['ONLY_ONE']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: enum with trailing comma', () => {
    const code = `enum ETrailing { A, B, C, };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['A', 'B', 'C']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: empty enum', () => {
    const code = `enum EEmpty { };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.kind).toBe('EnumDecl');
    expect(enumNode.members).toHaveLength(0);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: enum with base type and commas', () => {
    const code = `enum EFlags : int { NONE, READ = 1, WRITE = 2 };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['NONE', 'READ', 'WRITE']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: enum with hex values', () => {
    const code = `enum EHex { A = 0x0001, B = 0x0002, C = 0x0004 };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['A', 'B', 'C']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: enum followed by class with semicolons', () => {
    const code = `enum EColor { RED, GREEN, BLUE };
class Painter {
    EColor m_color;
    void SetColor(EColor color) {
        m_color = color;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
    expect(ast.body[0]).toHaveProperty('kind', 'EnumDecl');
    expect(ast.body[1]).toHaveProperty('kind', 'ClassDecl');
});

test('flags multiple semicolons in multi-member enum', () => {
    const code = `enum ERPCs {
    RPC_A = 100;
    RPC_B = 200;
    RPC_C = 300;
}`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['RPC_A', 'RPC_B', 'RPC_C']);
    const semiDiags = ast.diagnostics.filter(d => d.message.includes('Enum members must be separated by commas'));
    expect(semiDiags).toHaveLength(3);
});

test('flags only the semicolon in mixed comma/semicolon enum', () => {
    const code = `enum EMixed { A = 1, B = 2; C = 3 };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['A', 'B', 'C']);
    const semiDiags = ast.diagnostics.filter(d => d.message.includes('Enum members must be separated by commas'));
    expect(semiDiags).toHaveLength(1);
});

test('no false positive: enum with negative values', () => {
    const code = `enum ESigned { NEG = -1, ZERO = 0, POS = 1 };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['NEG', 'ZERO', 'POS']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: enum with bitwise OR values', () => {
    const code = `enum EBits { A = 1, B = 2, AB = 1 | 2 };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['A', 'B', 'AB']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

test('no false positive: enum with constant identifier value', () => {
    // enum member whose value references another identifier
    const code = `enum ERef { BASE = 100, DERIVED = BASE };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const enumNode = ast.body[0] as any;
    // BASE is consumed as value expression for DERIVED, not as a false member
    expect(enumNode.members.map((m: any) => m.name)).toEqual(['BASE', 'DERIVED']);
    expect(ast.diagnostics.filter(d => d.message.includes('semicolon'))).toHaveLength(0);
});

// ── Return statement detection tests ──────────────────────────────────────

test('detects return statements in function bodies', () => {
    const code = `class Foo {
    int GetValue() {
        return 42;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.hasBody).toBe(true);
    expect(func.returnStatements.length).toBe(1);
    expect(func.returnStatements[0].isEmpty).toBe(false);
});

test('detects bare return in void function', () => {
    const code = `class Foo {
    void DoStuff() {
        if (true)
            return;
        Print("hello");
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.hasBody).toBe(true);
    expect(func.returnStatements.length).toBe(1);
    expect(func.returnStatements[0].isEmpty).toBe(true);
});

test('detects multiple return statements', () => {
    const code = `class Foo {
    int GetValue(bool flag) {
        if (flag)
            return 1;
        return 0;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.returnStatements.length).toBe(2);
    expect(func.returnStatements[0].isEmpty).toBe(false);
    expect(func.returnStatements[1].isEmpty).toBe(false);
});

test('proto functions have no body', () => {
    const code = `class Foo {
    proto int GetValue();
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.hasBody).toBe(false);
    expect(func.returnStatements.length).toBe(0);
});

test('detects return this in method', () => {
    const code = `class Foo {
    Foo Clone() {
        return this;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.returnStatements.length).toBe(1);
    const ret = func.returnStatements[0];
    expect(ret.isEmpty).toBe(false);
    const exprText = code.substring(ret.exprStart, ret.exprEnd).trim();
    expect(exprText).toBe('this');
});

test('detects return this.Method() chain', () => {
    const code = `class Foo {
    string GetName() {
        return this.m_name;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.returnStatements.length).toBe(1);
    const ret = func.returnStatements[0];
    const exprText = code.substring(ret.exprStart, ret.exprEnd).trim();
    expect(exprText).toBe('this.m_name');
});

test('detects return with expression text', () => {
    const code = `class Foo {
    string GetName() {
        return m_name;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    expect(func.returnStatements.length).toBe(1);
    const ret = func.returnStatements[0];
    expect(ret.isEmpty).toBe(false);
    // The expression text between exprStart and exprEnd should contain 'm_name'
    const exprText = code.substring(ret.exprStart, ret.exprEnd).trim();
    expect(exprText).toBe('m_name');
});

test('error recovery: broken class member does not kill entire class', () => {
    // One broken member (badFunc has invalid syntax), rest should still parse
    const code = `class MyClass {
    int m_health;
    void BadFunc(@@@ GARBAGE) { }
    float m_speed;
    void GoodFunc() {
        int x = 5;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    // Class should still be parsed
    expect(ast.body.length).toBe(1);
    expect(ast.body[0]).toHaveProperty('kind', 'ClassDecl');
    const cls = ast.body[0] as any;
    expect(cls.name).toBe('MyClass');
    // Members before and after the broken one should still be present
    const memberNames = cls.members.map((m: any) => m.name);
    expect(memberNames).toContain('m_health');
    expect(memberNames).toContain('m_speed');
    expect(memberNames).toContain('GoodFunc');
});

test('error recovery: broken top-level decl does not kill other declarations', () => {
    // First class is fine, second has garbage, third is fine
    const code = `class A { int x; };
@@@ GARBAGE @@@;
class B { float y; };`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    // Both valid classes should be recovered
    const classNames = ast.body.filter((n: any) => n.kind === 'ClassDecl').map((n: any) => n.name);
    expect(classNames).toContain('A');
    expect(classNames).toContain('B');
});

// ============================================================================
// bodyIdentifierRefs tests
// ============================================================================

test('bodyIdentifierRefs: captures standalone identifiers in function body', () => {
    const code = `class Foo {
    void DoStuff() {
        int x = someValue;
        if (rpc_type != NOTIFICATIONS_RPC_CONFIG) {
            return;
        }
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const refNames = func.bodyIdentifierRefs.map((r: any) => r.name);
    expect(refNames).toContain('someValue');
    expect(refNames).toContain('rpc_type');
    expect(refNames).toContain('NOTIFICATIONS_RPC_CONFIG');
});

test('bodyIdentifierRefs: excludes member access after dot', () => {
    const code = `class Foo {
    void DoStuff() {
        obj.field = 1;
        obj.Method();
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const refNames = func.bodyIdentifierRefs.map((r: any) => r.name);
    // obj is captured (standalone), but field and Method are after '.' so excluded
    expect(refNames).toContain('obj');
    expect(refNames).not.toContain('field');
    expect(refNames).not.toContain('Method');
});

test('bodyIdentifierRefs: excludes function call targets', () => {
    const code = `class Foo {
    void DoStuff() {
        DoSomething();
        int x = GetValue();
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const refNames = func.bodyIdentifierRefs.map((r: any) => r.name);
    // Function call targets (followed by '(') are excluded
    expect(refNames).not.toContain('DoSomething');
    expect(refNames).not.toContain('GetValue');
});

test('bodyIdentifierRefs: captures static access targets (validated separately by bodyTypeRefs)', () => {
    const code = `class Foo {
    void DoStuff() {
        int x = SomeClass.CONSTANT;
        SomeEnum.VALUE;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const refNames = func.bodyIdentifierRefs.map((r: any) => r.name);
    // Identifiers followed by '.' ARE captured; they won't produce false positives
    // because checkBodyIdentifierRefs resolves them via findClassByName/findEnumByName.
    // The bodyTypeRefs system handles their cross-module checks separately.
    expect(refNames).toContain('SomeClass');
    expect(refNames).toContain('SomeEnum');
    // Members after '.' are NOT captured (prevPrev is '.')
    expect(refNames).not.toContain('CONSTANT');
    expect(refNames).not.toContain('VALUE');
});

test('bodyIdentifierRefs: captures identifiers in expressions with operators', () => {
    const code = `class Foo {
    void DoStuff() {
        int result = a + b * c;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const refNames = func.bodyIdentifierRefs.map((r: any) => r.name);
    expect(refNames).toContain('a');
    expect(refNames).toContain('b');
    expect(refNames).toContain('c');
});

test('bodyIdentifierRefs: deduplicates identical names', () => {
    const code = `class Foo {
    void DoStuff() {
        int x = val;
        int y = val;
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const valRefs = func.bodyIdentifierRefs.filter((r: any) => r.name === 'val');
    expect(valRefs.length).toBe(1);
});

test('bodyIdentifierRefs: excludes scope resolution (::) targets', () => {
    const code = `class Foo {
    void DoStuff() {
        Scope::Method();
    }
};`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const cls = ast.body[0] as any;
    const func = cls.members[0] as any;
    const refNames = func.bodyIdentifierRefs.map((r: any) => r.name);
    // 'Method' is after '::' so excluded
    expect(refNames).not.toContain('Method');
});

test('bodyIdentifierRefs: works for top-level functions', () => {
    const code = `void GlobalFunc() {
    int x = SOME_CONST;
    return;
}`;
    const doc = TextDocument.create('file:///test.enscript', 'enscript', 1, code);
    const ast = parse(doc);
    const func = ast.body[0] as any;
    const refNames = func.bodyIdentifierRefs.map((r: any) => r.name);
    expect(refNames).toContain('SOME_CONST');
});

test('playground', () => {
    const target_file = path.join("P:\\enscript\\test", "test_enscript.c");
    if (!fs.existsSync(target_file)) {
        // Skip when the local playground file is not available
        return;
    }
    const text = fs.readFileSync(target_file, "utf8");
    const doc = TextDocument.create(url.pathToFileURL(target_file).href, 'enscript', 1, text);
    const ast = parse(doc);
    expect(ast.body[0]).toHaveProperty('kind', 'ClassDecl');
});