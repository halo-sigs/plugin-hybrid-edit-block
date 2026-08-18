import { EditorSelection, Prec, type Extension } from "@codemirror/state";
import { keymap, type EditorView, type KeyBinding } from "@codemirror/view";
import * as mteKernel from "@susisu/mte-kernel";

type AlignmentValue = string;

interface TableEditorOptions {
  leftMarginChars?: Set<string>;
  formatType?: string;
  minDelimiterWidth?: number;
  defaultAlignment?: string;
  headerAlignment?: string;
  smartCursor?: boolean;
}

type ResolvedTableEditorOptions = Required<TableEditorOptions>;

interface TablePoint {
  row: number;
  column: number;
}

interface TableRange {
  start: TablePoint;
  end: TablePoint;
}

interface MteTextEditor {
  getCursorPosition(): TablePoint;
  setCursorPosition(pos: TablePoint): void;
  setSelectionRange(range: TableRange): void;
  getLastRow(): number;
  acceptsTableEdit(row: number): boolean;
  getLine(row: number): string;
  insertLine(row: number, line: string): void;
  deleteLine(row: number): void;
  replaceLines(startRow: number, endRow: number, lines: Array<string>): void;
  transact(func: () => void): void;
}

interface MteTableEditor {
  cursorIsInTable(options: ResolvedTableEditorOptions): boolean;
  format(options: ResolvedTableEditorOptions): void;
  formatAll(options: ResolvedTableEditorOptions): void;
  escape(options: ResolvedTableEditorOptions): void;
  moveFocus(
    rowOffset: number,
    columnOffset: number,
    options: ResolvedTableEditorOptions
  ): void;
  alignColumn(
    alignment: AlignmentValue,
    options: ResolvedTableEditorOptions
  ): void;
  nextCell(options: ResolvedTableEditorOptions): void;
  previousCell(options: ResolvedTableEditorOptions): void;
  nextRow(options: ResolvedTableEditorOptions): void;
  insertRow(options: ResolvedTableEditorOptions): void;
  deleteRow(options: ResolvedTableEditorOptions): void;
  moveRow(offset: number, options: ResolvedTableEditorOptions): void;
  insertColumn(options: ResolvedTableEditorOptions): void;
  deleteColumn(options: ResolvedTableEditorOptions): void;
  moveColumn(offset: number, options: ResolvedTableEditorOptions): void;
}

const {
  Alignment,
  Point,
  TableEditor,
  options: createTableOptions,
} = mteKernel as {
  Alignment: {
    readonly NONE: AlignmentValue;
    readonly LEFT: AlignmentValue;
    readonly RIGHT: AlignmentValue;
    readonly CENTER: AlignmentValue;
  };
  Point: new (row: number, column: number) => TablePoint;
  TableEditor: new (textEditor: MteTextEditor) => MteTableEditor;
  options: (options: TableEditorOptions) => ResolvedTableEditorOptions;
};

export type MarkdownTableCommandName =
  | "format"
  | "formatAll"
  | "escape"
  | "nextCell"
  | "previousCell"
  | "nextRow"
  | "moveLeft"
  | "moveRight"
  | "moveUp"
  | "moveDown"
  | "insertRow"
  | "deleteRow"
  | "moveRowUp"
  | "moveRowDown"
  | "insertColumn"
  | "deleteColumn"
  | "moveColumnLeft"
  | "moveColumnRight"
  | "alignNone"
  | "alignLeft"
  | "alignCenter"
  | "alignRight";

const TABLE_OPTIONS = createTableOptions({
  smartCursor: true,
});

const COMMANDS: Record<
  MarkdownTableCommandName,
  {
    requiresCursorInTable: boolean;
    run: (tableEditor: MteTableEditor) => void;
  }
> = {
  format: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.format(TABLE_OPTIONS),
  },
  formatAll: {
    requiresCursorInTable: false,
    run: (tableEditor) => tableEditor.formatAll(TABLE_OPTIONS),
  },
  escape: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.escape(TABLE_OPTIONS),
  },
  nextCell: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.nextCell(TABLE_OPTIONS),
  },
  previousCell: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.previousCell(TABLE_OPTIONS),
  },
  nextRow: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.nextRow(TABLE_OPTIONS),
  },
  moveLeft: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveFocus(0, -1, TABLE_OPTIONS),
  },
  moveRight: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveFocus(0, 1, TABLE_OPTIONS),
  },
  moveUp: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveFocus(-1, 0, TABLE_OPTIONS),
  },
  moveDown: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveFocus(1, 0, TABLE_OPTIONS),
  },
  insertRow: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.insertRow(TABLE_OPTIONS),
  },
  deleteRow: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.deleteRow(TABLE_OPTIONS),
  },
  moveRowUp: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveRow(-1, TABLE_OPTIONS),
  },
  moveRowDown: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveRow(1, TABLE_OPTIONS),
  },
  insertColumn: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.insertColumn(TABLE_OPTIONS),
  },
  deleteColumn: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.deleteColumn(TABLE_OPTIONS),
  },
  moveColumnLeft: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveColumn(-1, TABLE_OPTIONS),
  },
  moveColumnRight: {
    requiresCursorInTable: true,
    run: (tableEditor) => tableEditor.moveColumn(1, TABLE_OPTIONS),
  },
  alignNone: {
    requiresCursorInTable: true,
    run: (tableEditor) =>
      tableEditor.alignColumn(Alignment.NONE, TABLE_OPTIONS),
  },
  alignLeft: {
    requiresCursorInTable: true,
    run: (tableEditor) =>
      tableEditor.alignColumn(Alignment.LEFT, TABLE_OPTIONS),
  },
  alignCenter: {
    requiresCursorInTable: true,
    run: (tableEditor) =>
      tableEditor.alignColumn(Alignment.CENTER, TABLE_OPTIONS),
  },
  alignRight: {
    requiresCursorInTable: true,
    run: (tableEditor) =>
      tableEditor.alignColumn(Alignment.RIGHT, TABLE_OPTIONS),
  },
};

class CodeMirrorTableTextEditor implements MteTextEditor {
  private transactionDepth = 0;
  private workingLines: string[] | null = null;
  private workingSelection: { anchor: number; head: number } | null = null;

  constructor(private readonly view: EditorView) {}

  getCursorPosition(): TablePoint {
    const lines = this.getLines();
    const selection = this.workingSelection ?? {
      anchor: this.view.state.selection.main.anchor,
      head: this.view.state.selection.main.head,
    };
    return offsetToPoint(lines, selection.head);
  }

  setCursorPosition(pos: TablePoint): void {
    if (this.transactionDepth === 0) {
      this.transact(() => this.setCursorPosition(pos));
      return;
    }

    const anchor = pointToOffset(this.getMutableLines(), pos);
    this.workingSelection = { anchor, head: anchor };
  }

  setSelectionRange(range: TableRange): void {
    if (this.transactionDepth === 0) {
      this.transact(() => this.setSelectionRange(range));
      return;
    }

    this.workingSelection = {
      anchor: pointToOffset(this.getMutableLines(), range.start),
      head: pointToOffset(this.getMutableLines(), range.end),
    };
  }

  getLastRow(): number {
    return this.getLines().length - 1;
  }

  acceptsTableEdit(row: number): boolean {
    return row >= 0 && row <= this.getLastRow();
  }

  getLine(row: number): string {
    return this.getLines()[row] ?? "";
  }

  insertLine(row: number, line: string): void {
    if (this.transactionDepth === 0) {
      this.transact(() => this.insertLine(row, line));
      return;
    }

    const lines = this.getMutableLines();
    const targetRow = clamp(row, 0, lines.length);
    lines.splice(targetRow, 0, line);
  }

  deleteLine(row: number): void {
    if (this.transactionDepth === 0) {
      this.transact(() => this.deleteLine(row));
      return;
    }

    const lines = this.getMutableLines();
    if (row < 0 || row > lines.length - 1) {
      return;
    }
    lines.splice(row, 1);
    if (lines.length === 0) {
      lines.push("");
    }
  }

  replaceLines(startRow: number, endRow: number, lines: Array<string>): void {
    if (this.transactionDepth === 0) {
      this.transact(() => this.replaceLines(startRow, endRow, lines));
      return;
    }

    const mutableLines = this.getMutableLines();
    const start = clamp(startRow, 0, mutableLines.length);
    const end = clamp(endRow, start, mutableLines.length);
    mutableLines.splice(start, end - start, ...lines);
    if (mutableLines.length === 0) {
      mutableLines.push("");
    }
  }

  transact(func: () => void): void {
    const isRootTransaction = this.transactionDepth === 0;
    if (isRootTransaction) {
      this.workingLines = [...this.getLines()];
      this.workingSelection = {
        anchor: this.view.state.selection.main.anchor,
        head: this.view.state.selection.main.head,
      };
    }

    this.transactionDepth += 1;

    try {
      func();
    } finally {
      this.transactionDepth -= 1;
      if (isRootTransaction) {
        this.commit();
      }
    }
  }

  private getLines(): string[] {
    if (this.workingLines) {
      return this.workingLines;
    }
    return normalizeLines(this.view.state.doc.toString().split("\n"));
  }

  private getMutableLines(): string[] {
    if (!this.workingLines) {
      this.workingLines = [...this.getLines()];
    }
    return this.workingLines;
  }

  private commit(): void {
    const previousDoc = this.view.state.doc.toString();
    const nextLines = normalizeLines(
      this.workingLines ?? previousDoc.split("\n")
    );
    const nextDoc = nextLines.join("\n");
    const currentSelection = this.view.state.selection.main;
    const nextSelection = this.workingSelection ?? {
      anchor: currentSelection.anchor,
      head: currentSelection.head,
    };
    const anchor = clamp(nextSelection.anchor, 0, nextDoc.length);
    const head = clamp(nextSelection.head, 0, nextDoc.length);

    const docChanged = nextDoc !== previousDoc;
    const selectionChanged =
      anchor !== currentSelection.anchor || head !== currentSelection.head;

    if (docChanged || selectionChanged) {
      this.view.dispatch({
        ...(docChanged
          ? {
              changes: {
                from: 0,
                to: previousDoc.length,
                insert: nextDoc,
              },
            }
          : {}),
        selection: EditorSelection.create([
          EditorSelection.range(anchor, head),
        ]),
      });
    }

    this.workingLines = null;
    this.workingSelection = null;
  }
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const normalizeLines = (lines: string[]): string[] => {
  return lines.length > 0 ? lines : [""];
};

const pointToOffset = (lines: string[], point: TablePoint): number => {
  const row = clamp(point.row, 0, lines.length - 1);
  const column = clamp(point.column, 0, lines[row].length);
  let offset = 0;

  for (let index = 0; index < row; index += 1) {
    offset += lines[index].length + 1;
  }

  return offset + column;
};

const offsetToPoint = (lines: string[], offset: number): TablePoint => {
  let remaining = clamp(offset, 0, lines.join("\n").length);

  for (let row = 0; row < lines.length; row += 1) {
    const lineLength = lines[row].length;
    if (remaining <= lineLength) {
      return new Point(row, remaining);
    }
    remaining -= lineLength + 1;
  }

  const lastRow = lines.length - 1;
  return new Point(lastRow, lines[lastRow].length);
};

const executeMarkdownTableCommand = (
  view: EditorView,
  commandName: MarkdownTableCommandName,
  requireCurrentTable = true
): boolean => {
  const command = COMMANDS[commandName];
  const tableTextEditor = new CodeMirrorTableTextEditor(view);
  const tableEditor = new TableEditor(tableTextEditor);
  const mustBeInTable = requireCurrentTable && command.requiresCursorInTable;

  if (mustBeInTable && !tableEditor.cursorIsInTable(TABLE_OPTIONS)) {
    return false;
  }

  command.run(tableEditor);
  view.focus();
  return true;
};

const markdownTableKeybindings: KeyBinding[] = [
  {
    key: "Tab",
    run: (view) => executeMarkdownTableCommand(view, "nextCell"),
  },
  {
    key: "Shift-Tab",
    run: (view) => executeMarkdownTableCommand(view, "previousCell"),
  },
  {
    key: "Enter",
    run: (view) => executeMarkdownTableCommand(view, "nextRow"),
  },
  {
    key: "Escape",
    run: (view) => executeMarkdownTableCommand(view, "escape"),
  },
  {
    key: "Mod-Alt-f",
    run: (view) => executeMarkdownTableCommand(view, "format"),
  },
  {
    key: "Mod-Alt-Shift-f",
    run: (view) => executeMarkdownTableCommand(view, "formatAll", false),
  },
  {
    key: "Mod-ArrowLeft",
    run: (view) => executeMarkdownTableCommand(view, "moveLeft"),
  },
  {
    key: "Mod-ArrowRight",
    run: (view) => executeMarkdownTableCommand(view, "moveRight"),
  },
  {
    key: "Mod-ArrowUp",
    run: (view) => executeMarkdownTableCommand(view, "moveUp"),
  },
  {
    key: "Mod-ArrowDown",
    run: (view) => executeMarkdownTableCommand(view, "moveDown"),
  },
  {
    key: "Shift-Mod-ArrowLeft",
    run: (view) => executeMarkdownTableCommand(view, "alignLeft"),
  },
  {
    key: "Shift-Mod-ArrowRight",
    run: (view) => executeMarkdownTableCommand(view, "alignRight"),
  },
  {
    key: "Shift-Mod-ArrowUp",
    run: (view) => executeMarkdownTableCommand(view, "alignCenter"),
  },
  {
    key: "Shift-Mod-ArrowDown",
    run: (view) => executeMarkdownTableCommand(view, "alignNone"),
  },
  {
    key: "Mod-Alt-ArrowUp",
    run: (view) => executeMarkdownTableCommand(view, "moveRowUp"),
  },
  {
    key: "Mod-Alt-ArrowDown",
    run: (view) => executeMarkdownTableCommand(view, "moveRowDown"),
  },
  {
    key: "Mod-Alt-ArrowLeft",
    run: (view) => executeMarkdownTableCommand(view, "moveColumnLeft"),
  },
  {
    key: "Mod-Alt-ArrowRight",
    run: (view) => executeMarkdownTableCommand(view, "moveColumnRight"),
  },
  {
    key: "Mod-k Mod-i",
    run: (view) => executeMarkdownTableCommand(view, "insertRow"),
  },
  {
    key: "Mod-k Alt-Mod-i",
    run: (view) => executeMarkdownTableCommand(view, "deleteRow"),
  },
  {
    key: "Mod-k Mod-j",
    run: (view) => executeMarkdownTableCommand(view, "insertColumn"),
  },
  {
    key: "Mod-k Alt-Mod-j",
    run: (view) => executeMarkdownTableCommand(view, "deleteColumn"),
  },
];

export const markdownTableExtension = (): Extension => {
  return Prec.highest(keymap.of(markdownTableKeybindings));
};
