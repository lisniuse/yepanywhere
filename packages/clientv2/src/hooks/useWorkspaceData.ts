import { startTransition, useEffect, useMemo, useState } from "react";
import { providerTabs } from "../config/providerTabs";
import { fetchJson } from "../lib/api";
import {
  formatRelativeTime,
  pickerWindow,
  providerGroupFromName,
} from "../lib/workspace";
import type { ProjectItem, ProviderGroup, SessionItem } from "../types/workspace";

export function useWorkspaceData(routeProjectId?: string) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [pathDraft, setPathDraft] = useState("");
  const [pickerHint, setPickerHint] = useState<string | null>(null);
  const [addProjectError, setAddProjectError] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const data = await fetchJson<{ projects: ProjectItem[] }>("/api/projects");

        if (cancelled) {
          return;
        }

        setProjects(data.projects);
        setSelectedProjectId((current) => {
          if (
            routeProjectId &&
            data.projects.some((project) => project.id === routeProjectId)
          ) {
            return routeProjectId;
          }

          if (current && data.projects.some((project) => project.id === current)) {
            return current;
          }

          return data.projects[0]?.id ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          setProjectsError(
            error instanceof Error ? error.message : "加载项目失败",
          );
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [routeProjectId]);

  useEffect(() => {
    if (!routeProjectId) {
      return;
    }

    setSelectedProjectId((current) => {
      if (current === routeProjectId) {
        return current;
      }

      const hasProject = projects.some((project) => project.id === routeProjectId);
      return hasProject ? routeProjectId : current;
    });
  }, [projects, routeProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSessions([]);
      setSessionsError(null);
      return;
    }

    const controller = new AbortController();

    async function loadSessions() {
      setSessionsLoading(true);
      setSessionsError(null);

      try {
        const data = await fetchJson<{ sessions: SessionItem[] }>(
          `/api/projects/${selectedProjectId}/sessions`,
          { signal: controller.signal },
        );

        startTransition(() => {
          setSessions(data.sessions);
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setSessionsError(
            error instanceof Error ? error.message : "加载会话失败",
          );
          setSessions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSessionsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      controller.abort();
    };
  }, [selectedProjectId]);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;

  const groupedSessions = useMemo(() => {
    const groups: Record<ProviderGroup, SessionItem[]> = {
      claude: [],
      codex: [],
      opencode: [],
    };

    for (const session of sessions) {
      const group = providerGroupFromName(session.provider);
      if (group) {
        groups[group].push(session);
      }
    }

    return groups;
  }, [sessions]);

  const selectedSessions = useMemo(() => {
    return (Object.keys(groupedSessions) as ProviderGroup[]).reduce(
      (acc, provider) => {
        acc[provider] = groupedSessions[provider][0] ?? null;
        return acc;
      },
      {
        claude: null,
        codex: null,
        opencode: null,
      } as Record<ProviderGroup, SessionItem | null>,
    );
  }, [groupedSessions]);

  function openAddProjectModal() {
    setAddProjectError(null);
    setPickerHint(null);
    setIsAddProjectOpen(true);
  }

  function closeAddProjectModal() {
    setIsAddProjectOpen(false);
  }

  async function handlePickFolder() {
    if (!pickerWindow.showDirectoryPicker) {
      setPickerHint("当前环境不支持系统目录选择器，请直接粘贴绝对路径。");
      return;
    }

    try {
      const handle = await pickerWindow.showDirectoryPicker();
      if (handle?.name) {
        setPickerHint(`已选择文件夹 “${handle.name}”，请补全为绝对路径后提交。`);
        if (!pathDraft.trim()) {
          setPathDraft(handle.name);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setPickerHint("目录选择器打开失败，请手动输入路径。");
    }
  }

  async function handleAddProject() {
    const nextPath = pathDraft.trim();
    if (!nextPath) {
      setAddProjectError("请输入项目绝对路径。");
      return;
    }

    setIsAddingProject(true);
    setAddProjectError(null);

    try {
      const data = await fetchJson<{ project: ProjectItem }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ path: nextPath }),
      });

      setProjects((current) => {
        const deduped = current.filter((project) => project.id !== data.project.id);
        return [data.project, ...deduped];
      });
      setSelectedProjectId(data.project.id);
      setIsAddProjectOpen(false);
      setPathDraft("");
      setPickerHint(null);
    } catch (error) {
      setAddProjectError(error instanceof Error ? error.message : "添加项目失败");
    } finally {
      setIsAddingProject(false);
    }
  }

  return {
    projects,
    projectsLoading,
    projectsError,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    sessionsLoading,
    sessionsError,
    groupedSessions,
    selectedSessions,
    isAddProjectOpen,
    openAddProjectModal,
    closeAddProjectModal,
    pathDraft,
    setPathDraft,
    pickerHint,
    addProjectError,
    isAddingProject,
    handlePickFolder,
    handleAddProject,
    formatRelativeTime,
  };
}
