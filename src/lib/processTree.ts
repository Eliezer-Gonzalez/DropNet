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
  const assignedParents = new Map<string, ProcessNode>();
  const wouldCreateCycle = (node: ProcessNode, parent: ProcessNode): boolean => {
    let ancestor: ProcessNode | undefined = parent;
    while (ancestor) {
      if (ancestor.key === node.key) return true;
      ancestor = assignedParents.get(ancestor.key);
    }
    return false;
  };
  nodes.forEach((node) => {
    const parent = node.parentPid === null ? undefined : byPid.get(node.parentPid);
    if (parent && !wouldCreateCycle(node, parent)) {
      parent.children.push(node);
      assignedParents.set(node.key, parent);
    } else {
      roots.push(node);
    }
  });
  const normalized = query.trim().toLocaleLowerCase();
  const matches = (node: ProcessNode, ancestors = new Set<string>()): ProcessNode | null => {
    if (ancestors.has(node.key)) return null;
    ancestors.add(node.key);
    const children = node.children.map((child) => matches(child, ancestors)).filter((child): child is ProcessNode => child !== null);
    ancestors.delete(node.key);
    const nameMatches = !normalized || node.name.toLocaleLowerCase().includes(normalized);
    const stateMatches = filter === "all" || (filter === "blocked" ? node.blocked : !node.blocked);
    if (!(nameMatches && stateMatches) && children.length === 0) return null;
    return { ...node, children };
  };
  return roots.map((node) => matches(node)).filter((node): node is ProcessNode => node !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}
