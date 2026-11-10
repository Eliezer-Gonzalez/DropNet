export interface ProcessRow {
  key: string;
  pid: number;
  parentPid: number | null;
  name: string;
  path: string | null;
  iconData: string | null;
  blocked: boolean;
  fileExists: boolean;
  tracked: boolean;
  running: boolean;
}

export interface StartupRecoveryReport {
  configurationRecovered: boolean;
  stalePaths: string[];
  restoredPaths: string[];
  failures: Array<{ path: string; detail: string }>;
}

export type ProcessNode = ProcessRow & { children: ProcessNode[] };
export type SortColumn = "name" | "pid" | "status";
export type SortDirection = "ascending" | "descending";
export interface ProcessSort {
  column: SortColumn;
  direction: SortDirection;
}
