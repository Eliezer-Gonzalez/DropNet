import type { ProcessNode, ProcessRow } from "../types";

export function buildProcessTree(rows: ProcessRow[], query: string, filter: string): ProcessNode[] {
  const nodes = new Map<string, ProcessNode>();
  const byPid = new Map<number, ProcessNode>();
  rows.forEach((row) => {
    const node = { ...row, children: [] };
    nodes.set(row.key, node);
    if (row.running) byPid.set(row.pid, node);
  });
  const roots: ProcessNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentPid === null ? undefined : byPid.get(node.parentPid);
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const normalized = query.trim().toLocaleLowerCase();
  const matches = (node: ProcessNode): ProcessNode | null => {
    const children = node.children.map(matches).filter((child): child is ProcessNode => child !== null);
    const nameMatches = !normalized || node.name.toLocaleLowerCase().includes(normalized);
    const stateMatches = filter === "all" || (filter === "blocked" ? node.blocked : !node.blocked);
    if (!(nameMatches && stateMatches) && children.length === 0) return null;
    return { ...node, children };
  };
  return roots.map(matches).filter((node): node is ProcessNode => node !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
