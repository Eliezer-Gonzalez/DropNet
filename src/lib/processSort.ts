import type { ProcessNode, ProcessSort } from "../types";

export function sortProcessTree(nodes: ProcessNode[], sort: ProcessSort): ProcessNode[] {
  const compare = (first: ProcessNode, second: ProcessNode) => {
    let result = 0;
    if (sort.column === "name") {
      result = first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: "base" });
    } else if (sort.column === "pid") {
      result = first.pid - second.pid;
    } else {
      result = Number(first.blocked) - Number(second.blocked);
    }
    return sort.direction === "ascending" ? result : -result;
  };

  return nodes
    .map((node) => ({ ...node, children: sortProcessTree(node.children, sort) }))
    .sort(compare);
}
