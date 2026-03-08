import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { ClassDeclNode, File } from '../ast/parser';

/**
 * Base interface for all diagnostic rules.
 * Each rule inspects AST nodes and produces zero or more diagnostics.
 */
export interface DiagnosticRule {
  /** Unique rule identifier (e.g., "ES001") */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Severity of diagnostics produced by this rule */
  severity: DiagnosticSeverity;
  /** Run the rule against an AST and return diagnostics */
  check(ast: File, context: RuleContext): Diagnostic[];
}

/**
 * Context object passed to diagnostic rules, providing
 * access to the analyzer's indexes and resolution methods.
 */
export interface RuleContext {
  /** Look up a class by name */
  findClassByName(name: string): ClassDeclNode | null;
  /** Get all classes in inheritance hierarchy */
  getClassHierarchy(className: string): ClassDeclNode[];
  /** Get the number of indexed files (for threshold checks) */
  indexedFileCount: number;
}
