import type { FC } from "react";
import { Task } from "../api/apiClient";

interface TaskListProps {
  tasks: Task[];
  selectedIds: Set<string>;
  onTaskSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  allSelected: boolean;
  loading: boolean;
}

export const TaskList: FC<TaskListProps> = ({
  tasks,
  selectedIds,
  onTaskSelect,
  onSelectAll,
  allSelected,
  loading,
}) => {
  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "ready":
        return "#6c757d";
      case "in_progress":
        return "#007bff";
      case "review":
        return "#ffc107";
      case "done":
        return "#28a745";
      default:
        return "#6c757d";
    }
  };

  const getStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "ready": return "Ready";
      case "in_progress": return "In Progress";
      case "review": return "Review";
      case "done": return "Done";
      default: return status;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="task-list-empty" style={{
        padding: "24px",
        textAlign: "center",
        color: "#6c757d",
        backgroundColor: "#f8f9fa",
        borderRadius: "12px",
        fontSize: "1rem"
      }}>
        📭 No tasks available
      </div>
    );
  }

  return (
    <div className="task-list">
      {/* Desktop Header */}
      <div
        className="task-list-header desktop-only"
        style={{
          display: "grid",
          gridTemplateColumns: "50px 80px 1fr 150px 120px",
          padding: "14px 16px",
          backgroundColor: "#f8f9fa",
          fontWeight: 600,
          borderBottom: "2px solid #dee2e6",
          borderRadius: "12px 12px 0 0",
          fontSize: "0.9rem",
          color: "#495057"
        }}
      >
        <div>
          <input
            type="checkbox"
            style={{ width: "22px", height: "22px", cursor: "pointer" }}
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            disabled={loading}
          />
        </div>
        <div>ID</div>
        <div>Title</div>
        <div>Status</div>
        <div>Created</div>
      </div>

      {/* Mobile Header */}
      <div
        className="mobile-header"
        style={{
          display: "none",
          padding: "12px 16px",
          backgroundColor: "#f8f9fa",
          borderBottom: "2px solid #dee2e6",
          borderRadius: "12px 12px 0 0",
          alignItems: "center",
          gap: "12px"
        }}
      >
        <input
          type="checkbox"
          style={{ width: "24px", height: "24px", cursor: "pointer", flexShrink: 0 }}
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
          disabled={loading}
        />
        <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "#495057" }}>
          Select All ({tasks.length} tasks)
        </span>
      </div>

      <style>{`
        .task-list {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-header { display: flex !important; }
          .task-list-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            background: transparent !important;
            border: none !important;
            padding: 8px 0 !important;
          }
          .task-item {
            display: flex !important;
            flex-direction: column !important;
            padding: 16px !important;
            background: white !important;
            border-radius: 12px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
            border: 1px solid #e9ecef !important;
            gap: 12px !important;
            min-width: 0;
            margin-bottom: 0 !important;
          }
          .task-item-check {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .task-item-check input[type="checkbox"] {
            width: 28px !important;
            height: 28px !important;
            flex-shrink: 0;
            cursor: pointer;
          }
          .task-item-content {
            flex: 1;
            min-width: 0;
          }
          .task-item-title {
            font-weight: 600;
            font-size: 1.05rem;
            color: #212529;
            margin-bottom: 6px;
            line-height: 1.4;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .task-item-description {
            font-size: 0.9rem;
            color: #6c757d;
            line-height: 1.4;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .task-item-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 4px;
            padding-top: 12px;
            border-top: 1px solid #e9ecef;
          }
          .task-item-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #6c757d;
          }
          .task-status-badge {
            padding: 6px 12px !important;
            font-size: 0.8rem !important;
            font-weight: 600 !important;
            border-radius: 20px !important;
          }
          .task-list-empty {
            padding: 32px 20px !important;
            font-size: 1rem !important;
          }
        }
        @media (max-width: 480px) {
          .task-item {
            padding: 14px !important;
          }
          .task-item-title {
            font-size: 1rem !important;
          }
          .task-item-footer {
            flex-direction: column;
            align-items: flex-start !important;
          }
        }
        .mobile-only-inline {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-only-inline {
            display: inline;
          }
        }
        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          .task-item {
            touch-action: manipulation;
          }
          input[type="checkbox"] {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>

      {/* Task Items */}
      <div className="task-list-container" style={{
        display: "flex",
        flexDirection: "column",
        gap: "1px",
        backgroundColor: "#dee2e6",
        border: "1px solid #dee2e6",
        borderRadius: "0 0 12px 12px",
        overflow: "hidden",
        width: "100%",
        maxWidth: "100%"
      }}>
        {tasks.map((task) => (
          <div
            key={task.id}
            className="task-item"
            style={{
              display: "grid",
              gridTemplateColumns: "50px 80px 1fr 150px 120px",
              padding: "14px 16px",
              backgroundColor: selectedIds.has(task.id) ? "#e7f3ff" : "white",
              opacity: loading ? 0.6 : 1,
              transition: "background-color 0.2s ease",
              alignItems: "center"
            }}
          >
            {/* Desktop Layout */}
            <div className="desktop-only" style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                style={{ width: "22px", height: "22px", cursor: "pointer" }}
                checked={selectedIds.has(task.id)}
                onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                disabled={loading}
              />
            </div>
            <div className="desktop-only" style={{ color: "#6c757d", fontSize: "0.9rem" }}>#{task.id}</div>
            <div className="desktop-only" style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{
                overflowWrap: "break-word",
                wordWrap: "break-word",
                wordBreak: "break-word",
                fontWeight: 500,
                color: "#212529"
              }}>{task.title}</div>
              {task.description && (
                <div style={{ fontSize: "0.85rem", color: "#6c757d", marginTop: "4px", lineHeight: 1.4 }}>
                  {task.description}
                </div>
              )}
            </div>
            <div className="desktop-only">
              <span
                className="task-status-badge"
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: getStatusColor(task.status),
                  color: task.status === "review" ? "#000" : "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                {task.status.replace("_", " ")}
              </span>
            </div>
            <div className="desktop-only" style={{ fontSize: "0.85rem", color: "#6c757d" }}>
              {new Date(task.createdAt).toLocaleDateString()}
            </div>

            {/* Mobile Layout - Card Style */}
            <div className="task-item-check mobile-only">
              <input
                type="checkbox"
                style={{ width: "24px", height: "24px", cursor: "pointer" }}
                checked={selectedIds.has(task.id)}
                onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                disabled={loading}
              />
              <div className="task-item-content">
                <div className="task-item-title">{task.title}</div>
                {task.description && (
                  <div className="task-item-description">{task.description}</div>
                )}
              </div>
            </div>
            <div className="task-item-footer mobile-only">
              <div className="task-item-meta">
                <span>#{task.id}</span>
                <span>•</span>
                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <span
                className="task-status-badge"
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: getStatusColor(task.status),
                  color: task.status === "review" ? "#000" : "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                {getStatusLabel(task.status)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .mobile-only {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-only {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskList;
