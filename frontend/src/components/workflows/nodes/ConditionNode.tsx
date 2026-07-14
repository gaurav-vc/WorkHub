import { Handle, Position, useReactFlow } from "@xyflow/react";
import { GitBranch, MapPin, X, CheckCircle2, XCircle } from "lucide-react";

export default function ConditionNode({ id, data }: { id: string; data: any }) {
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
      <div className={`bg-white border-2 ${data.execution ? (data.execution.status === 'Success' ? 'border-green-500 shadow-green-100' : 'border-red-500 shadow-red-100') : 'border-slate-200'} rounded-xl w-24 h-24 flex flex-col items-center justify-center shadow-sm group-hover:border-green-500 group-hover:shadow-md transition-all relative`}>
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
        
        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-2">
           <GitBranch className="h-6 w-6 text-green-700" />
        </div>
        
        {/* True Handle */}
        <Handle isConnectable={true} 
          type="source" 
          id="true"
          position={Position.Right} 
          className="w-3 h-3 bg-slate-400 border-2 border-white translate-x-1 !top-1/3" 
        />
        <div className="absolute right-[-24px] top-[26%] text-[10px] text-slate-500 font-medium bg-white px-1 z-10">true</div>

        {/* False Handle */}
        <Handle isConnectable={true} 
          type="source" 
          id="false"
          position={Position.Right} 
          className="w-3 h-3 bg-slate-400 border-2 border-white translate-x-1 !top-2/3" 
        />
        <div className="absolute right-[-26px] top-[58%] text-[10px] text-slate-500 font-medium bg-white px-1 z-10">false</div>

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
