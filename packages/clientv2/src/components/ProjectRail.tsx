import { memo } from "react";
import {
  PlusCircleIcon,
  SearchIcon,
} from "./icons";
import type { ProjectItem } from "../types/workspace";

interface ProjectRailProps {
  projects: ProjectItem[];
  projectsLoading: boolean;
  projectsError: string | null;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onOpenAddProject: () => void;
  formatRelativeTime: (input: string | null) => string;
}

export const ProjectRail = memo(function ProjectRail({
  projects,
  projectsLoading,
  projectsError,
  selectedProjectId,
  onSelectProject,
  onOpenAddProject,
  formatRelativeTime,
}: ProjectRailProps) {
  return (
    <aside className="project-rail">
      <div className="project-rail__chrome">
        <div className="sidebar-shortcuts" aria-label="工作区导航">
          <button
            type="button"
            className="sidebar-shortcuts__item sidebar-shortcuts__item--primary"
            onClick={onOpenAddProject}
          >
            <PlusCircleIcon className="sidebar-shortcuts__icon" />
            <span>添加项目</span>
          </button>
          <div className="sidebar-shortcuts__item">
            <SearchIcon className="sidebar-shortcuts__icon" />
            <span>项目搜索</span>
          </div>
        </div>
      </div>

      <div className="project-list-panel">
        <div className="project-list-panel__title">
          <span>Projects</span>
          <strong>{projects.length}</strong>
        </div>

        {projectsLoading ? (
          <div className="empty-state compact-empty-state">
            <strong>正在加载项目...</strong>
          </div>
        ) : null}

        {!projectsLoading && projectsError ? (
          <div className="empty-state compact-empty-state">
            <strong>项目列表加载失败</strong>
            <p>{projectsError}</p>
          </div>
        ) : null}

        {!projectsLoading && !projectsError ? (
          <div className="project-list" role="list" aria-label="项目列表">
            {projects.map((project) => {
              const isActive = project.id === selectedProjectId;

              return (
                <button
                  key={project.id}
                  type="button"
                  className={
                    isActive ? "project-card project-card--active" : "project-card"
                  }
                  onClick={() => onSelectProject(project.id)}
                >
                  <div className="project-card__topline">
                    <span className="project-card__name">{project.name}</span>
                    <span className="project-card__time">
                      {formatRelativeTime(project.lastActivity)}
                    </span>
                  </div>
                  <p className="project-card__path">{project.path}</p>
                  <div className="project-card__meta">
                    <span>{project.sessionCount} 个会话</span>
                    <span>{project.activeOwnedCount} 个运行中</span>
                    {project.activeExternalCount > 0 ? (
                      <span>{project.activeExternalCount} 个外部会话</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </aside>
  );
});
