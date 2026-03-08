import {
  Connection,
  SignatureHelp,
  SignatureHelpParams,
  SignatureInformation,
  ParameterInformation,
  TextDocuments
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Analyzer } from '../../analysis/project/graph';

export function registerSignatureHelp(conn: Connection, docs: TextDocuments<TextDocument>): void {
  conn.onSignatureHelp((params: SignatureHelpParams): SignatureHelp | null => {
    const doc = docs.get(params.textDocument.uri);
    if (!doc) return null;

    const analyser = Analyzer.instance();
    const result = analyser.getSignatureHelp(doc, params.position);
    if (!result) return null;

    const signatures: SignatureInformation[] = result.signatures.map(sig => ({
      label: sig.label,
      parameters: sig.parameters.map(p => ({
        label: p.label,
        documentation: p.documentation
      } as ParameterInformation))
    }));

    return {
      signatures,
      activeSignature: result.activeSignature,
      activeParameter: result.activeParameter
    };
  });
}
