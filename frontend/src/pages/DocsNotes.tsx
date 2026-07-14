import { useState, useEffect, useRef } from "react";
import {
  Folder, FileText, Search, MoreHorizontal, Trash2,
  Plus, Download, UploadCloud, Share2, ArrowLeft, FolderPlus, User
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/config";
import { cn } from "@/lib/utils";

export default function DocsNotes() {
  const { token, username } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'company'>('my');
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [folders, setFolders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareItem, setShareItem] = useState<{type: 'folder'|'document', id: number} | null>(null);
  const [shareUserId, setShareUserId] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [token]);

  useEffect(() => {
    fetchData();
    setCurrentFolderId(null);
  }, [activeTab, token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/employees/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let folderEndpoint = `${API_BASE}/docs/folders/`;
      let docEndpoint = `${API_BASE}/docs/documents/`;

      if (activeTab === 'shared') {
        folderEndpoint = `${API_BASE}/docs/folders/shared_with_me/`;
        docEndpoint = `${API_BASE}/docs/documents/shared_with_me/`;
      }

      const [fRes, dRes] = await Promise.all([
        fetch(folderEndpoint, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(docEndpoint, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (fRes.ok) {
        const fData = await fRes.json();
        setFolders(fData);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDocuments(dData);
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to load files", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const payload = {
        name: newFolderName,
        is_common: activeTab === 'company',
        parent: currentFolderId
      };
      const res = await fetch(`${API_BASE}/docs/folders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: 'Folder created' });
        setIsNewFolderOpen(false);
        setNewFolderName('');
        await fetchData();
      }
    } catch (e) {
      toast({ title: 'Error creating folder', variant: 'destructive' });
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadFile) return;

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('file', uploadFile);
    if (currentFolderId) formData.append('folder', currentFolderId.toString());
    
    // For Company folder upload
    // Wait, documents don't have is_common, their folder dictates it or we might need to rely on the backend.
    // If we're in company tab but no folder is selected, where does it go? Let's just create it. The API Document model doesn't have is_common.
    // It relies on folder__is_common. So for company docs, they MUST be inside a company folder.

    try {
      const res = await fetch(`${API_BASE}/docs/documents/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        toast({ title: 'File uploaded' });
        setIsUploadOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData();
      } else {
        toast({ title: 'Upload failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error uploading file', variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (id: number) => {
    if (!confirm('Delete this folder and all contents?')) return;
    try {
      const res = await fetch(`${API_BASE}/docs/folders/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('Delete this file?')) return;
    try {
      const res = await fetch(`${API_BASE}/docs/documents/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareItem || !shareUserId) return;
    try {
      const payload: any = { shared_with: parseInt(shareUserId) };
      if (shareItem.type === 'folder') payload.folder = shareItem.id;
      else payload.document = shareItem.id;

      const res = await fetch(`${API_BASE}/docs/shares/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: 'Item shared successfully' });
        setIsShareOpen(false);
        setShareUserId('');
      } else {
        toast({ title: 'Failed to share', variant: 'destructive' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtering Logic
  let displayFolders = folders.filter(f => {
    if (activeTab === 'my') return !f.is_common && !f.is_shared;
    if (activeTab === 'company') return f.is_common;
    return true; // Shared tab already filtered by backend
  });

  let displayDocs = documents.filter(d => {
    // Shared tab already filtered by backend
    if (activeTab === 'shared') return true; 
    
    // In My Folders or Company, filter docs by active Tab rules
    if (activeTab === 'my') return !d.is_shared && (!d.folder || folders.find(f => f.id === d.folder && !f.is_common));
    if (activeTab === 'company') return d.folder && folders.find(f => f.id === d.folder && f.is_common);
    return true;
  });

  // Hierarchy Logic
  displayFolders = displayFolders.filter(f => (f.parent || null) === (currentFolderId || null));
  displayDocs = displayDocs.filter(d => (d.folder || null) === (currentFolderId || null));

  // Search filter
  if (search) {
    displayFolders = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    displayDocs = documents.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || (d.file_name || '').toLowerCase().includes(search.toLowerCase()));
  }

  const currentFolderData = folders.find(f => f.id === currentFolderId);

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in gap-6 w-full pb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
            <Folder className="h-6 w-6 text-blue-600" /> Docs & Files
          </h1>
          <p className="text-slate-500 mt-1">Manage, upload, and share your files securely.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-slate-200">
                <FolderPlus className="h-4 w-4" /> New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Folder</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Folder Name</label>
                  <Input required value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. Q1 Marketing" />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Create</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <UploadCloud className="h-4 w-4" /> Upload File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">File Title</label>
                  <Input required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="e.g. Budget 2026.xlsx" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select File</label>
                  <Input required type="file" ref={fileInputRef} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Upload</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 space-y-1 overflow-y-auto custom-scrollbar">
          <button 
            className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors", activeTab === 'my' ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100")}
            onClick={() => setActiveTab('my')}
          >
            <Folder className="h-4 w-4" /> My Folders
          </button>
          <button 
            className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors", activeTab === 'shared' ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100")}
            onClick={() => setActiveTab('shared')}
          >
            <Share2 className="h-4 w-4" /> Shared with me
          </button>
          <button 
            className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors", activeTab === 'company' ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100")}
            onClick={() => setActiveTab('company')}
          >
            <User className="h-4 w-4" /> Company's Folder
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              {currentFolderId ? (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setCurrentFolderId(currentFolderData?.parent || null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-sm font-bold text-slate-700">{currentFolderData?.name}</h2>
                </>
              ) : (
                <h2 className="text-sm font-bold text-slate-700 ml-2">
                  {activeTab === 'my' ? 'My Folders' : activeTab === 'shared' ? 'Shared with me' : 'Company Folders'}
                </h2>
              )}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
          </div>

          {/* Files Grid */}
          <div className="p-4 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>
            ) : (displayFolders.length === 0 && displayDocs.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-20">
                <Folder className="h-12 w-12 text-slate-200" />
                <p>This folder is empty</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Render Folders */}
                {displayFolders.map(folder => (
                  <Card key={`f-${folder.id}`} className="shadow-none border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group" onDoubleClick={() => setCurrentFolderId(folder.id)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <Folder className="h-5 w-5 fill-blue-500/20" />
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => setCurrentFolderId(folder.id)}>
                        <h3 className="text-sm font-semibold text-slate-800 truncate">{folder.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{folder.updatedAt}</p>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setShareItem({type: 'folder', id: folder.id}); setIsShareOpen(true); }}>
                              <Share2 className="h-4 w-4 mr-2" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteFolder(folder.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Render Documents */}
                {displayDocs.map(doc => (
                  <Card key={`d-${doc.id}`} className="shadow-none border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 truncate" title={doc.title}>{doc.title}</h3>
                        <p className="text-[11px] text-slate-500 truncate">{doc.file_size || '0 KB'} • {doc.updatedAt}</p>
                      </div>
                      <div className="flex items-center">
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setShareItem({type: 'document', id: doc.id}); setIsShareOpen(true); }}>
                              <Share2 className="h-4 w-4 mr-2" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteDocument(doc.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share Item</DialogTitle></DialogHeader>
          <form onSubmit={handleShare} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Colleague</label>
              <Select value={shareUserId} onValueChange={setShareUserId}>
                <SelectTrigger><SelectValue placeholder="Select an employee..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>{u.full_name || u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Share</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
