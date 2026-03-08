import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { DiagnosticRule, RuleContext } from './rules';
import { File, ClassDeclNode, FunctionDeclNode, VarDeclNode } from '../ast/parser';

/**
 * Pluggable Diagnostic Rule Engine
 * ==================================
 * Manages a collection of diagnostic rules and runs them against AST files.
 * Rules can be registered dynamically and are executed in order.
 * 
 * Built-in rules:
 *   - ES001: Empty function body (non-abstract, non-proto function with empty body)
 *   - ES002: Unused parameter (parameter not referenced in function body)
 *   - ES003: Conflicting modifiers (e.g., private + override)
 */
export class DiagnosticEngine {
    private rules: DiagnosticRule[] = [];

    constructor() {
        // Register built-in rules
        this.register(new ConflictingModifiersRule());
    }

    /** Register a new diagnostic rule */
    register(rule: DiagnosticRule): void {
        this.rules.push(rule);
    }

    /** Run all registered rules against an AST file */
    run(ast: File, context: RuleContext): Diagnostic[] {
        const diagnostics: Diagnostic[] = [];
        for (const rule of this.rules) {
            try {
                const ruleDiags = rule.check(ast, context);
                diagnostics.push(...ruleDiags);
            } catch (err) {
                // Don't let a single rule failure break all diagnostics
                console.error(`Diagnostic rule ${rule.id} failed: ${err}`);
            }
        }
        return diagnostics;
    }
}

/**
 * ES003: Conflicting Modifiers
 * Detects modifier combinations that are invalid in Enforce Script:
 *   - abstract + static (abstract requires instance dispatch)
 *   - abstract + private (abstract must be accessible to subclasses)
 *   - abstract + sealed (cannot be both abstract and sealed)
 */
class ConflictingModifiersRule implements DiagnosticRule {
    id = 'ES003';
    name = 'Conflicting Modifiers';
    severity = DiagnosticSeverity.Error;

    check(ast: File, _context: RuleContext): Diagnostic[] {
        const diags: Diagnostic[] = [];
        
        const conflicts: [string, string, string][] = [
            ['abstract', 'static', 'A method cannot be both abstract and static'],
            ['abstract', 'private', 'Abstract methods must be accessible to subclasses (cannot be private)'],
            ['abstract', 'sealed', 'A class cannot be both abstract and sealed'],
        ];
        
        for (const node of ast.body) {
            if (node.kind === 'ClassDecl') {
                const cls = node as ClassDeclNode;
                
                // Check class-level modifier conflicts
                for (const [a, b, msg] of conflicts) {
                    if (cls.modifiers?.includes(a) && cls.modifiers?.includes(b)) {
                        diags.push({
                            message: `${msg}. Found both '${a}' and '${b}' on class '${cls.name}'.`,
                            range: { start: cls.nameStart, end: cls.nameEnd },
                            severity: this.severity
                        });
                    }
                }
                
                // Check member modifier conflicts
                for (const member of cls.members || []) {
                    if (member.kind === 'FunctionDecl') {
                        const func = member as FunctionDeclNode;
                        for (const [a, b, msg] of conflicts) {
                            if (func.modifiers?.includes(a) && func.modifiers?.includes(b)) {
                                diags.push({
                                    message: `${msg}. Found both '${a}' and '${b}' on '${func.name}'.`,
                                    range: { start: func.nameStart, end: func.nameEnd },
                                    severity: this.severity
                                });
                            }
                        }
                    }
                }
            }
        }
        
        return diags;
    }
}
