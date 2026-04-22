import { useCallback, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AddProjectModal } from "./components/AddProjectModal";
import { ConversationStage } from "./components/ConversationStage";
import { ProjectRail } from "./components/ProjectRail";
import { useWorkspaceData } from "./hooks/useWorkspaceData";

function WorkspaceScreen() {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const workspace = useWorkspaceData(projectId);

  useEffect(() => {
    if (!workspace.selectedProjectId) {
      return;
    }

    if (workspace.selectedProjectId !== projectId) {
      navigate(`/projects/${workspace.selectedProjectId}`, {
        replace: !projectId,
      });
    }
  }, [navigate, projectId, workspace.selectedProjectId]);

  const handleSelectProject = useCallback((nextProjectId: string) => {
    workspace.setSelectedProjectId(nextProjectId);
    navigate(`/projects/${nextProjectId}`);
  }, [navigate, workspace]);

  return (
    <>
      <div className="workspace-shell">
        <ProjectRail
          projects={workspace.projects}
          projectsLoading={workspace.projectsLoading}
          projectsError={workspace.projectsError}
          selectedProjectId={workspace.selectedProjectId}
          onSelectProject={handleSelectProject}
          onOpenAddProject={workspace.openAddProjectModal}
          formatRelativeTime={workspace.formatRelativeTime}
        />

        <ConversationStage
          selectedProject={workspace.selectedProject}
          selectedProjectId={workspace.selectedProjectId}
          groupedSessions={workspace.groupedSessions}
          selectedSessions={workspace.selectedSessions}
          providerAvailability={workspace.providerAvailability}
          sessionsLoading={workspace.sessionsLoading}
          sessionsError={workspace.sessionsError}
          refreshProjects={workspace.refreshProjects}
          refreshSessions={workspace.refreshSessions}
          formatRelativeTime={workspace.formatRelativeTime}
        />
      </div>

      <AddProjectModal
        isOpen={workspace.isAddProjectOpen}
        pathDraft={workspace.pathDraft}
        errorMessage={workspace.addProjectError}
        isSubmitting={workspace.isAddingProject}
        pickerHint={workspace.pickerHint}
        onPathChange={workspace.setPathDraft}
        onPickFolder={workspace.handlePickFolder}
        onClose={workspace.closeAddProjectModal}
        onSubmit={workspace.handleAddProject}
      />
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<WorkspaceScreen />} />
      <Route path="/projects/:projectId" element={<WorkspaceScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
