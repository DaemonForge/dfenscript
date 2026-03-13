import {
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  TextDocumentChangeEvent,
  TextDocuments
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Analyzer } from '../../analysis/project/graph';
import * as fs from 'node:fs';
import * as url from 'node:url';

export function registerDiagnostics(conn: Connection, docs: TextDocuments<TextDocument>): void {
    const analyser = Analyzer.instance();

    const validate = (change: TextDocumentChangeEvent<TextDocument>) => {
        // Only report diagnostics for files inside the workspace folder
        if (!analyser.isWorkspaceFile(change.document.uri)) {
            conn.sendDiagnostics({ uri: change.document.uri, diagnostics: [] });
            return;
        }
        const diagnostics = analyser.runDiagnostics(change.document);
        conn.sendDiagnostics({ uri: change.document.uri, diagnostics });
    };

    // Debounce timers per-URI so each file gets its own delay
    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const DEBOUNCE_MS = 300;

    docs.onDidOpen(validate);
    docs.onDidSave((change) => {
        // On save: cancel any pending debounce and run immediately
        const uri = change.document.uri;
        const pending = debounceTimers.get(uri);
        if (pending) {
            clearTimeout(pending);
            debounceTimers.delete(uri);
        }
        validate(change);
    });
    docs.onDidChangeContent((change) => {
        // On every keystroke: do a lightweight parse + index update
        // immediately so hover/definition stay responsive, then
        // schedule the HEAVY diagnostic checks after a debounce delay.
        analyser.ensureIndexed(change.document);

        const uri = change.document.uri;
        const pending = debounceTimers.get(uri);
        if (pending) clearTimeout(pending);
        debounceTimers.set(uri, setTimeout(() => {
            debounceTimers.delete(uri);
            // Re-fetch the latest document — the user may have typed more
            const latestDoc = docs.get(uri);
            if (latestDoc) {
                if (!analyser.isWorkspaceFile(uri)) {
                    conn.sendDiagnostics({ uri, diagnostics: [] });
                    return;
                }
                const diagnostics = analyser.runDiagnostics(latestDoc);
                conn.sendDiagnostics({ uri, diagnostics });
            }
        }, DEBOUNCE_MS));
    });

    docs.onDidClose((change) => {
        const uri = change.document.uri;
        const pending = debounceTimers.get(uri);
        if (pending) {
            clearTimeout(pending);
            debounceTimers.delete(uri);
        }

        // When a file is closed after a rename or deletion, the old URI's
        // symbols are still in the index causing duplicate warnings.
        // Check if the file still exists on disk — if not, clean up immediately
        // instead of waiting for the (potentially delayed) file watcher event.
        if (uri.startsWith('file:')) {
            try {
                const filePath = url.fileURLToPath(uri);
                if (!fs.existsSync(filePath)) {
                    analyser.removeFromIndex(uri);
                    conn.sendDiagnostics({ uri, diagnostics: [] });
                }
            } catch {
                // Ignore URI parsing errors for non-file schemes
            }
        }
    });
}
