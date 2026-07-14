import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Search, Clock, Eye, Tag, ArrowLeft, ThumbsUp,
  Share2, Bookmark, Plus, Download, FileText
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getKbArticles, createKbArticle } from "@/api/collaboration";
import { cn } from "@/lib/utils";

interface Article {
  id: string | number;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  author: { name: string; initials: string };
  readTime: string;
  views: number;
  updatedAt: string;
  content: string;
  file?: string | null;
  file_url?: string | null;
}

const categories = [
  { id: "all", name: "All Articles" },
  { id: "engineering", name: "Engineering" },
  { id: "product", name: "Product" },
  { id: "hr", name: "HR & People" },
  { id: "design", name: "Design" },
  { id: "onboarding", name: "Onboarding" },
];

export default function KnowledgeBase() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Form
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newCategory, setNewCategory] = useState("engineering");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchArticles();
  }, [token]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const data = await getKbArticles();
      setArticles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const formData = new FormData();
    formData.append("title", newTitle);
    formData.append("excerpt", newExcerpt);
    formData.append("category", newCategory);
    if (uploadFile) {
      formData.append("file", uploadFile);
    }

    try {
      await createKbArticle(formData);
      toast({ title: "Knowledge Added Successfully" });
      setIsUploadOpen(false);
      setNewTitle("");
      setNewExcerpt("");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchArticles();
    } catch (e) {
      toast({ title: "Error adding knowledge", variant: "destructive" });
    }
  };

  const filtered = articles.filter((a) => {
    const matchCategory = activeCategory === "all" || (a.category && a.category.toLowerCase() === activeCategory.toLowerCase());
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      a.title.toLowerCase().includes(searchLower) || 
      (a.excerpt || '').toLowerCase().includes(searchLower) || 
      (a.tags || []).some((t) => t.toLowerCase().includes(searchLower));
    return matchCategory && matchSearch;
  });

  if (selectedArticle) {
    return (
      <div className="w-full flex flex-col h-[calc(100vh-6rem)] animate-fade-in gap-6 pb-4">
        <div className="shrink-0">
          <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="gap-1.5 text-slate-500 -ml-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to articles
          </Button>
        </div>
        <div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(selectedArticle.tags || []).map((t) => (
              <Badge key={t} variant="secondary" className="text-xs bg-slate-100 text-slate-600 border-none">{t}</Badge>
            ))}
            {selectedArticle.category && (
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 border-none capitalize">{selectedArticle.category.replace('-', ' ')}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-800">{selectedArticle.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-blue-100 text-blue-600 font-semibold">{selectedArticle.author?.initials || 'A'}</AvatarFallback></Avatar>
              <span className="font-medium text-slate-700">{selectedArticle.author?.name || 'Anonymous'}</span>
            </div>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{selectedArticle.readTime || '1 min'} read</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{selectedArticle.views || 0} views</span>
            <span>Updated {selectedArticle.updatedAt}</span>
          </div>
        </div>
        
        <div className="flex gap-2 justify-between items-center border-y border-slate-100 py-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-slate-600"><ThumbsUp className="h-3.5 w-3.5" /> Helpful</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-slate-600"><Bookmark className="h-3.5 w-3.5" /> Save</Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-slate-600"><Share2 className="h-3.5 w-3.5" /> Share</Button>
          </div>
          {selectedArticle.file_url && (
            <a href={selectedArticle.file_url} target="_blank" rel="noreferrer">
              <Button size="sm" className="gap-1.5 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none shadow-none">
                <Download className="h-3.5 w-3.5" /> Download Attachment
              </Button>
            </a>
          )}
        </div>

        <Card className="shadow-none border border-slate-200 bg-white flex-1 overflow-y-auto custom-scrollbar p-6 rounded-xl">
          <CardContent className="p-0 prose prose-sm max-w-none text-slate-600">
            {selectedArticle.excerpt && <p className="text-lg font-medium text-slate-700 mb-6">{selectedArticle.excerpt}</p>}
            
            {selectedArticle.content ? selectedArticle.content.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-display font-bold text-slate-800 mt-6 mb-3">{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-display font-semibold text-slate-800 mt-5 mb-2">{line.slice(3)}</h2>;
              if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-slate-800 mt-4 mb-1">{line.slice(4)}</h3>;
              if (line.startsWith("- [ ] ")) return <label key={i} className="flex items-center gap-2 text-sm py-0.5"><input type="checkbox" className="rounded border-slate-300" />{line.slice(6)}</label>;
              if (line.startsWith("- ")) return <li key={i} className="text-sm ml-4 list-disc marker:text-slate-300">{line.slice(2)}</li>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="text-sm leading-relaxed">{line}</p>;
            }) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No text content available.</p>
                {selectedArticle.file_url && <p className="text-sm text-slate-400 mt-1">Please download the attachment above to view the details.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] animate-fade-in gap-6 pb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Knowledge Base
          </h1>
          <p className="text-slate-500 mt-1">Search and browse company documentation, guides, and policies</p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Add Knowledge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to Knowledge Base</DialogTitle></DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Article or Document Title" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Brief Description</label>
                <Input value={newExcerpt} onChange={e => setNewExcerpt(e.target.value)} placeholder="What is this about?" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.id !== 'all').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Upload File (Optional)</label>
                <Input type="file" ref={fileInputRef} onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Submit Knowledge</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search articles, guides, policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 border-slate-200"
        />
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count = cat.id === 'all' ? articles.length : articles.filter(a => a.category?.toLowerCase() === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                activeCategory === cat.id
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {cat.name} <span className="ml-1.5 opacity-60 font-medium">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading knowledge base...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((article) => (
            <Card
              key={article.id}
              className="shadow-sm border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
              onClick={() => setSelectedArticle(article)}
            >
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {article.category && (
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-none capitalize">{article.category.replace('-', ' ')}</Badge>
                  )}
                  {article.file_url && (
                    <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-600 border-none flex items-center gap-1"><FileText className="h-3 w-3" /> Attachment</Badge>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">{article.title}</h3>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed flex-1">{article.excerpt || 'Click to view details'}</p>
                
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-700 font-bold">{article.author?.initials || 'A'}</AvatarFallback></Avatar>
                    {article.author?.name || 'Anonymous'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{article.readTime || '1 min'}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{article.views || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
          <BookOpen className="h-12 w-12 mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No articles found in this category.</p>
          <Button variant="outline" className="mt-4" onClick={() => setActiveCategory('all')}>Clear Filters</Button>
        </div>
      )}
    </div>
  );
}
