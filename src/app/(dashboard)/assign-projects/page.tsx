"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  FolderKanban,
  Search,
  Check,
  User,
  CheckCircle2,
  Layers,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/context/language-context";
import { fetchAssignData, assignProjectToUser, unassignProjectFromUser } from "./assign.action";
import toast from "react-hot-toast";
import Image from "next/image";

interface BackendProject {
  id: number;
  name: string;
  description: string;
  environment: string;
  status: string;
}

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  photo?: string;
  profileImage?: string;
  assignedProjects: any[];
  assignedProjectIds: number[];
}

export default function AssignProjectsPage() {
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const { data: session, status } = useSession();

  // Admin access guard
  const isAdmin = session?.user?.role === "admin";

  // View mode
  const [viewTab, setViewTab] = useState<"interactive" | "matrix">("interactive");

  // Data State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  
  // Selection State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [session]);

  async function loadData() {
    setLoading(true);
    const res = await fetchAssignData();
    if (res.success) {
      // Map users to include an array of assigned project IDs for easy checking
      const mappedUsers = (res.users || []).map((u: any) => ({
        ...u,
        assignedProjectIds: Array.isArray(u.assignedProjects) ? u.assignedProjects.map((p: any) => p.id || p.projectId) : []
      }));
      setUsers(mappedUsers);
      setProjects(res.projects || []);
      
      // Auto select first tester/user
      if (mappedUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(mappedUsers[0].id);
      }
    } else {
      toast.error(res.error || "فشل تحميل البيانات");
    }
    setLoading(false);
  }

  // Active User
  const activeUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || users[0];
  }, [users, selectedUserId]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, userSearch]);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = projectSearch.toLowerCase();
      return p.name.toLowerCase().includes(q);
    });
  }, [projects, projectSearch]);

  // Toggle Assignment API Call
  const toggleProject = async (projectId: number) => {
    if (!activeUser) return;
    
    const isAssigned = activeUser.assignedProjectIds.includes(projectId);
    
    // Optimistic UI Update
    setUsers(prev => prev.map(u => {
      if (u.id !== activeUser.id) return u;
      const newIds = isAssigned 
        ? u.assignedProjectIds.filter(id => id !== projectId)
        : [...u.assignedProjectIds, projectId];
      return { ...u, assignedProjectIds: newIds };
    }));

    // API Call
    let res;
    if (isAssigned) {
      res = await unassignProjectFromUser(activeUser.id, projectId);
    } else {
      res = await assignProjectToUser(activeUser.id, projectId);
    }

    if (res.success) {
      toast.success(res.message || "تم التحديث بنجاح");
    } else {
      // Revert on failure
      toast.error(res.error);
      loadData(); 
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">جاري التحميل...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200/80 shadow-lg text-center">
          <CardHeader className="space-y-3 pb-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center ring-8 ring-red-50/50">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <CardTitle className="text-xl font-bold text-[#0b1c30]">صلاحيات غير كافية</CardTitle>
            <CardDescription className="text-sm text-[#6d797f]">
              إسناد المشاريع وتحديد الصلاحيات مقتصر حصرياً على مديري النظام (Administrators).
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/dashboard" className="w-full">
              <Button variant="ghost" className="w-full text-xs text-slate-500">
                <BackIcon className="w-4 h-4" />
                العودة إلى لوحة المؤشرات
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* ── Page Header ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/dashboard" className="text-xs font-medium text-slate-400 hover:text-[#006685] transition-colors">
              {isRTL ? "لوحة التحكم" : "Dashboard"}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-[#006685]">
              {isRTL ? "إسناد المشاريع" : "Assign Projects"}
            </span>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold px-2 py-0.5 gap-1">
              <ShieldCheck className="w-3 h-3" /> Admin Only
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b1c30] tracking-tight">
            {isRTL ? "إسناد وتعيين المشاريع للمستخدمين" : "Assign Projects to Users"}
          </h1>
          <p className="text-xs sm:text-sm text-[#6d797f] mt-1">
            {isRTL
              ? "حدد المشاريع التي يحق لكل مستخدم الوصول إليها واختبارها (يتم الحفظ تلقائياً)"
              : "Select which projects each user can access (Auto-saves instantly)"}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setViewTab("interactive")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewTab === "interactive" ? "bg-[#006685] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{isRTL ? "تخصيص تفاعلي" : "Interactive View"}</span>
          </button>
          <button
            onClick={() => setViewTab("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewTab === "matrix" ? "bg-[#006685] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>{isRTL ? "مصفوفة الإسناد" : "Matrix"}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#6d797f] block">إجمالي المستخدمين</span>
              <span className="text-2xl font-extrabold text-[#0b1c30]">{users.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#e5eeff] text-[#006685] flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#6d797f] block">إجمالي المشاريع</span>
              <span className="text-2xl font-extrabold text-[#006685]">{projects.length}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#bfe9ff]/50 text-[#006685] flex items-center justify-center shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#6d797f] block">متوسط الإسناد</span>
              <span className="text-2xl font-extrabold text-[#006c49]">
                {(users.reduce((acc, u) => acc + (u.assignedProjectIds?.length || 0), 0) / (users.length || 1)).toFixed(1)}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TAB 1: Interactive Assignment ── */}
      {viewTab === "interactive" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Users List */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-slate-200/80 shadow-xs overflow-hidden">
              <CardHeader className="p-4 border-b border-slate-100 pb-3">
                <CardTitle className="text-sm font-bold text-[#0b1c30]">اختر المستخدم</CardTitle>
                <div className="relative mt-2">
                  <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="بحث بالاسم أو الإيميل..."
                    className={`h-9 text-xs rounded-lg ${isRTL ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-1.5 max-h-[540px] overflow-y-auto">
                {filteredUsers.map((u) => {
                  const isSelected = u.id === activeUser?.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#eff4ff] border-[#006685] ring-1 ring-[#006685]/30 shadow-xs"
                          : "bg-white border-slate-200/70 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200 shrink-0">
                             <Image src={u.profileImage || u.photo || "/avatar.png"} alt={u.name} fill className="object-cover"/>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#0b1c30] truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">{u.email}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 bg-emerald-50 text-emerald-700">
                          {u.assignedProjectIds.length} مشاريع
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Manage Projects */}
          <div className="lg:col-span-8 space-y-4">
            {activeUser && (
              <Card className="border-slate-200/80 shadow-xs bg-linear-to-r from-[#eff4ff]/60 via-white to-white">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 shadow-md ring-2 ring-white">
                       <Image src={activeUser.profileImage || activeUser.photo || "/avatar.png"} alt={activeUser.name} fill className="object-cover"/>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#0b1c30]">{activeUser.name}</h2>
                      <span className="text-xs text-slate-500 block">{activeUser.role} • {activeUser.email}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] text-slate-500 block">المشاريع المسندة</span>
                    <span className="text-lg font-black text-[#006685]">{activeUser.assignedProjectIds.length} / {projects.length}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200/80 shadow-xs">
              <CardContent className="p-4">
                <div className="relative w-full sm:w-1/2">
                  <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? "right-3" : "left-3"}`} />
                  <Input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="ابحث عن مشروع..."
                    className={`h-9 text-xs rounded-lg ${isRTL ? "pr-9 pl-3 text-right" : "pl-9 pr-3 text-left"}`}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredProjects.map((project) => {
                const isAssigned = activeUser?.assignedProjectIds.includes(project.id);
                return (
                  <Card
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className={`border transition-all cursor-pointer rounded-xl ${
                      isAssigned ? "bg-white border-[#00aee0] shadow-md ring-1 ring-[#00aee0]" : "bg-white hover:border-slate-300"
                    }`}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-sm text-[#0b1c30] truncate">{project.name}</span>
                        <span className="text-xs text-slate-400 mt-0.5">{project.environment}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isAssigned ? "bg-[#006685] text-white" : "border border-slate-300 bg-slate-50"
                      }`}>
                        {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Matrix View ── */}
      {viewTab === "matrix" && (
        <Card className="border-slate-200/80 shadow-xs overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>المستخدم</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>الصلاحية</TableHead>
                  <TableHead className="text-center">العدد</TableHead>
                  <TableHead className={isRTL ? "text-right" : "text-left"}>المشاريع المسندة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <div className="flex items-center gap-3">
                         <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                             <Image src={u.profileImage || u.photo || "/avatar.png"} alt={u.name} fill className="object-cover"/>
                          </div>
                        <span className="font-semibold text-sm">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{u.role}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600">{u.assignedProjectIds.length}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.assignedProjectIds.map(pid => {
                          const p = projects.find(x => x.id === pid);
                          if (!p) return null;
                          return (
                            <Badge key={pid} variant="outline" className="bg-[#eff4ff] text-[#006685] border-[#00aee0]/30 text-[10px]">
                              {p.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
