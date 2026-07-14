import { Handle, Position, useReactFlow } from "@xyflow/react";
import { Zap, Clock, Users, Mail, Bell, Settings, CheckSquare, X, CheckCircle2, XCircle } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "check-square": <CheckSquare className="h-6 w-6 text-white" />,
  clock: <Clock className="h-6 w-6 text-white" />,
  users: <Users className="h-6 w-6 text-white" />,
  zap: <Zap className="h-6 w-6 text-white" />,
  mail: <Mail className="h-6 w-6 text-white" />,
  bell: <Bell className="h-6 w-6 text-white" />,
  settings: <Settings className="h-6 w-6 text-white" />,
};

export default function ActionNode({ id, data }: { id: string; data: any }) {
  const { setNodes, setEdges } = useReactFlow();
  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
  };

  return (
    <div className="flex flex-col items-center group relative">
      <button 
        onClick={onDelete} 
        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200 z-50"
        title="Delete Node"
      >
        <X className="h-3 w-3" />
      </button>
      <div className={`bg-white border-2 ${data.execution ? (data.execution.status === 'Success' ? 'border-green-500 shadow-green-100' : 'border-red-500 shadow-red-100') : 'border-slate-200'} rounded-xl w-24 h-24 flex flex-col items-center justify-center shadow-sm group-hover:border-blue-400 group-hover:shadow-md transition-all relative`}>
        {data.execution && (
          <div className="absolute -top-3 -right-3 z-10 bg-white rounded-full">
            {data.execution.status === 'Success' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 fill-white" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 fill-white" />
            )}
          </div>
        )}
        <Handle isConnectable={true} 
          type="target" 
          position={Position.Left} 
          className="w-3 h-3 bg-slate-400 border-2 border-white -translate-x-1" 
        />
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center mb-2 shadow-sm rotate-45 overflow-hidden">
          <div className="-rotate-45">
             {iconMap[data.icon] || <Zap className="h-5 w-5 text-white" />}
          </div>
        </div>
        <Handle isConnectable={true} 
          type="source" 
          position={Position.Right} 
          className="w-3 h-3 bg-slate-400 border-2 border-white translate-x-1" 
        />
      </div>
      <div className="mt-2 text-xs font-medium text-slate-700 text-center w-28 whitespace-pre-wrap leading-tight">
        {data.label}
      </div>
      {data.execution && (
        <div className="mt-1 text-[9px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          {new Date(data.execution.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}
    </div>
  );
}
