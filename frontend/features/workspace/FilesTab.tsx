"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon } from "@/components/Icons";
import { EmptyState, ErrorBanner, LoadingState } from "@/components/ui";
import { BlurFade } from "@/components/ui/blur-fade";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MagicCard } from "@/components/ui/magic-card";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";

interface TreeNode {
  name: string;
  path: string;
  file: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", file: false, children: [] };
  for (const path of paths) {
    const parts = path.replace(/^\/+/, "").split("/").filter(Boolean);
    let node = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let child = node.children.find((entry) => entry.name === part);
      if (!child) {
        child = { name: part, path: parts.slice(0, index + 1).join("/"), file: isFile, children: [] };
        node.children.push(child);
      }
      if (isFile) child.file = true;
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.file === b.file ? a.name.localeCompare(b.name) : a.file ? 1 : -1));
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);
  return root.children;
}

function TreeItem({
  node,
  depth,
  selected,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isSelected = selected === node.path;

  return (
    <li>
      <button
        type="button"
        onClick={() => (node.file ? onSelect(node.path) : setOpen((value) => !value))}
        title={node.path}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-[11px] transition-colors",
          isSelected ? "bg-muted text-muted-foreground" : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {node.file ? (
          <>
            <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </>
        ) : (
          <>
            {open ? <ChevronDownIcon className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRightIcon className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </>
        )}
      </button>
      {!node.file && open && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FilesTab({ projectId }: { projectId: string }) {
  const filesQuery = usePolling(() => api.files(projectId), 4000, `files-${projectId}`);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const paths = filesQuery.data ?? [];
  const tree = useMemo(() => buildTree(paths), [paths]);

  const selectFile = async (path: string) => {
    setSelected(path);
    setLoadingFile(true);
    setFileError(null);
    try {
      const result = await api.file(projectId, path);
      setContent(result.content);
    } catch (err) {
      setContent(null);
      setFileError(err instanceof Error ? err.message : "Unable to read file");
    } finally {
      setLoadingFile(false);
    }
  };

  return (
    <div>
      {filesQuery.error && <div className="mb-4"><ErrorBanner message={filesQuery.error} onRetry={filesQuery.refresh} /></div>}
      {fileError && <div className="mb-4"><ErrorBanner message={fileError} /></div>}

      {filesQuery.loading && paths.length === 0 ? (
        <LoadingState label="Scanning workspace…" />
      ) : paths.length === 0 ? (
        <EmptyState icon={<FolderIcon className="h-5 w-5" />} title="Workspace is empty" description="Generated files appear here as agents implement the project." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <MagicCard gradientColor="rgba(0, 0, 0,0.10)" className="rounded-lg p-2">
            <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {paths.length} file{paths.length === 1 ? "" : "s"}
            </p>
            <ScrollArea className="h-[480px]">
              <ul className="pr-2">
                {tree.map((node) => (
                  <TreeItem key={node.path} node={node} depth={0} selected={selected} onSelect={(path) => void selectFile(path)} />
                ))}
              </ul>
            </ScrollArea>
          </MagicCard>

          <BlurFade delay={0.08} offset={10}>
          <div className="min-w-0 overflow-hidden rounded-lg border border-black/[0.07] bg-canvas/60 shadow-panel">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <span className="truncate font-mono text-[11px] text-foreground">{selected ?? "Select a file to view its contents"}</span>
              {content !== null && <span className="shrink-0 text-[10px] text-muted-foreground">{content.split("\n").length} lines</span>}
            </div>
            {loadingFile ? (
              <LoadingState label="Reading file…" />
            ) : content === null ? (
              <EmptyState icon={<FileIcon className="h-5 w-5" />} title="No file selected" description="Choose a file from the workspace tree on the left." />
            ) : (
              <div className="max-h-[480px] overflow-auto">
                <pre className="min-w-max py-3 font-mono text-[11px] leading-[1.6] text-foreground">
                  {content.split("\n").map((line, index) => (
                    <div key={index} className="flex hover:bg-black/[0.025]">
                      <span className="sticky left-0 w-12 shrink-0 select-none bg-canvas/95 pr-3 text-right text-[10px] text-muted-foreground">{index + 1}</span>
                      <span className="whitespace-pre pr-6">{line || " "}</span>
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </div>
          </BlurFade>
        </div>
      )}
    </div>
  );
}
