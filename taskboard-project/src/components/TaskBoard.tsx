import React, { useState } from "react";
import { TaskList } from "./TaskList";
import { apiClient, Task } from "../api/apiClient";

export const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Fetch tasks on component mount
  React.useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTasks();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = (id: string, selected: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (selected) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} selected task(s)?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      setError(null);
      await apiClient.batchDeleteTasks(Array.from(selectedIds));
      setSelectedIds(new Set());
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tasks");
    } finally {
      setLoading(false);
    }
  };

  const hasSelectedTasks = selectedIds.size > 0;
  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;

  return (
    <div className="task-board" style={{ maxWidth: "1200px", margin: "0 auto", padding: "10px", width: "100%", boxSizing: "border-box" }}>
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
        padding: "10px",
        backgroundColor: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        borderRadius: "8px",
        position: "relative"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>📋 Task Board</h1>

        {/* Hamburger Menu Button for Mobile */}
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          style={{
            display: "none",
            background: "none",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "1.3rem",
            cursor: "pointer",
            minHeight: "44px",
            minWidth: "44px",
            touchAction: "manipulation"
          }}
        >
          {isMenuOpen ? "✕" : "☰"}
        </button>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" style={{ display: "flex", gap: "10px" }}>
          <button onClick={loadTasks} style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid #007bff",
            backgroundColor: "transparent",
            color: "#007bff",
            cursor: "pointer",
            minHeight: "44px",
            fontSize: "0.95rem",
            fontWeight: 500
          }}>🔄 Refresh</button>
          <button style={{
            padding: "10px 20px",
            borderRadius: "8px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer",
            minHeight: "44px",
            fontSize: "0.95rem",
            fontWeight: 500
          }}>➕ New Task</button>
        </nav>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <nav className="mobile-nav" style={{
            display: "none",
            flexDirection: "column",
            position: "absolute",
            top: "calc(100% + 8px)",
            right: "10px",
            background: "white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "12px",
            borderRadius: "12px",
            zIndex: 1000,
            minWidth: "180px",
            gap: "10px"
          }}>
            <button onClick={() => { loadTasks(); setIsMenuOpen(false); }} style={{
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #007bff",
              backgroundColor: "transparent",
              color: "#007bff",
              cursor: "pointer",
              minHeight: "48px",
              fontSize: "1rem",
              fontWeight: 500,
              textAlign: "left"
            }}>🔄 Refresh</button>
            <button onClick={() => setIsMenuOpen(false)} style={{
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              cursor: "pointer",
              minHeight: "48px",
              fontSize: "1rem",
              fontWeight: 500,
              textAlign: "left"
            }}>➕ New Task</button>
          </nav>
        )}
      </header>

      <style>{`
        .task-board {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          .desktop-nav { display: none !important; }
          .mobile-nav { display: flex !important; }
          .batch-toolbar {
            flex-direction: column;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .batch-toolbar button {
            width: 100%;
            min-height: 48px !important;
          }
          .task-board {
            padding: 8px !important;
          }
          header h1 {
            font-size: 1.25rem !important;
          }
        }
        @media (max-width: 480px) {
          .task-board {
            padding: 6px !important;
          }
          header {
            padding: 10px !important;
          }
          header h1 {
            font-size: 1.15rem !important;
          }
          .mobile-nav {
            left: 10px !important;
            right: 10px !important;
            min-width: auto !important;
          }
        }
        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          button, input[type="checkbox"] {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>

      {error && (
        <div className="error-message" style={{ color: "red", marginBottom: "10px", padding: "10px", border: "1px solid red", borderRadius: "4px" }}>
          Error: {error}
        </div>
      )}

      {/* Batch Operations Toolbar */}
      {hasSelectedTasks && (
        <div
          className="batch-toolbar"
          style={{
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            border: "1px solid #dee2e6"
          }}
        >
          <span style={{ fontWeight: "bold", flex: 1 }}>
            {selectedIds.size} task(s) selected
          </span>
          <button
            onClick={handleBatchDelete}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              minHeight: "44px"
            }}
          >
            {loading ? "Deleting..." : "Delete Selected"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              minHeight: "44px"
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Task List */}
      <TaskList
        tasks={tasks}
        selectedIds={selectedIds}
        onTaskSelect={handleTaskSelect}
        onSelectAll={handleSelectAll}
        allSelected={allSelected}
        loading={loading}
      />
    </div>
  );
};

export default TaskBoard;
