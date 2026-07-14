import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProjectBoard from "@/components/tasks/ProjectBoard";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) return null;

  return (
    <ProjectBoard 
      projectId={parseInt(id, 10)} 
      onBack={() => navigate('/tasks/projects')} 
    />
  );
}
