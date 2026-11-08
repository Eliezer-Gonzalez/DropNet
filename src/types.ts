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

export type ProcessNode = ProcessRow & { children: ProcessNode[] };
