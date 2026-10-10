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
  const { dir, t } = useLanguage();
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
    // Only load if users array is empty (initial load)
    if (status === "authenticated" && users.length === 0) {
      loadData();
    }
  }, [status]);

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
      toast.error(res.error || t("error_load_failed"));
    }
    setLoading(false);
  }

  const toggleProject = async (projectId: number) => {
    if (!selectedUserId) return;
    
    // Optimistic Update
    const userIndex = users.findIndex(u => u.id === selectedUserId);
    if (userIndex === -1) return;
    
    const user = users[userIndex];
    const isAssigned = user.assignedProjectIds.includes(projectId);
    
    const newAssignedIds = isAssigned 
      ? user.assignedProjectIds.filter(id => id !== projectId)
      : [...user.assignedProjectIds, projectId];
      
    // Update local state immediately for snappy UI
    const updatedUsers = [...users];
    updatedUsers[userIndex] = { ...user, assignedProjectIds: newAssignedIds };
    setUsers(updatedUsers);
    
    // API Call
    let res;
    if (isAssigned) {
       res = await unassignProjectFromUser(selectedUserId, projectId);
    } else {
       res = await assignProjectToUser(selectedUserId, projectId);
    }
    
    // Revert if failed
    if (!res.success) {
      toast.error(res.error || (isAssigned ? t("unassign_error") : t("assign_error")));
      setUsers(users); // Revert to old state
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-[#38CAF0]">{t("login_loading")}</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-12 min-h-[80vh] flex flex-col items-center justify-center bg-[#f8f9ff]">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">{t("access_denied_title")}</h1>
        <p className="text-slate-500 mb-8 text-center max-w-md leading-relaxed">
          {t("access_denied_desc")}
        </p>
        <Link href="/dashboard">
          <Button className="bg-[#00A2D2] hover:bg-[#008eb8] text-white shadow-md shadow-[#00A2D2]/20 px-8 h-12 rounded-xl flex items-center gap-2 cursor-pointer transition-colors">
            <BackIcon className="w-4 h-4" />
            <span>{t("return_dashboard")}</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Filtered data
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );
  
  const selectedUser = users.find(u => u.id === selectedUserId);
  
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const totalAssignments = users.reduce((acc, user) => acc + user.assignedProjectIds.length, 0);

  return (
    <div className="p-6 space-y-8 bg-[#f8f9ff] min-h-screen pb-20">
      
      {/* Header section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-[#6d797f] mb-1 font-medium">
          <Link href="/dashboard" className="hover:text-[#38CAF0] transition-colors">{t("dashboard_link")}</Link>
          <span className="text-slate-300">/</span>
          <span className="text-[#38CAF0]">{t("assign_projects_link")}</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold text-[#0b1c30]">{t("assign_title")}</CardTitle>
            <p className="text-sm text-[#6d797f] mt-1.5">
              {t("assign_subtitle")}
            </p>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button
              onClick={() => setViewTab("interactive")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewTab === "interactive" 
                ? "bg-[#e5eeff] text-[#38CAF0] shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t("view_interactive")}</span>
            </button>
            <button
              onClick={() => setViewTab("matrix")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                viewTab === "matrix" 
                ? "bg-[#e5eeff] text-[#38CAF0] shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>{t("view_matrix")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200/60 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#6d797f] block">{t("users_count")}</span>
              <span className="text-2xl font-bold text-[#0b1c30]">{users.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200/60 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#6d797f] block">{t("projects_count")}</span>
              <span className="text-2xl font-bold text-[#0b1c30]">{projects.length}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200/60 shadow-sm bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-[#6d797f] block">{t("assignments_count")}</span>
              <span className="text-2xl font-bold text-[#0b1c30]">{totalAssignments}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewTab === "interactive" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Users List */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Card className="border-slate-200/60 shadow-sm flex-1">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-[#0b1c30]">{t("select_user")}</CardTitle>
              </CardHeader>
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                  <Input 
                    placeholder={t("search_users")}
                    className={`h-9 bg-white text-sm ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${
                        selectedUserId === user.id 
                        ? "bg-[#e5eeff] border-[#38CAF0]/30 shadow-sm" 
                        : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-white">
                        <Image
                          src={user.profileImage || user.photo || "/avatar.png"}
                          alt={user.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className={`flex flex-col flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`text-sm font-bold truncate ${selectedUserId === user.id ? 'text-[#38CAF0]' : 'text-slate-800'}`}>
                          {user.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-slate-200 ${selectedUserId === user.id ? 'bg-white' : ''}`}>
                            {user.role}
                          </Badge>
                          <span className="text-[10px] text-slate-500 font-medium">
                            • {user.assignedProjectIds.length} {t("assigned_projects_count")}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {filteredUsers.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-sm">
                      {t("users_empty_search")}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Projects for Selected User */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {selectedUser ? (
              <Card className="border-slate-200/60 shadow-sm flex-1">
                <CardHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                     <div className="relative w-12 h-12 rounded-full overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                        <Image
                          src={selectedUser.profileImage || selectedUser.photo || "/avatar.png"}
                          alt={selectedUser.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-[#0b1c30]">{selectedUser.name}</CardTitle>
                        <span className="text-[11px] text-slate-500 block">{selectedUser.email}</span>
                      </div>
                  </div>
                  
                  <div className="relative w-64">
                    <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                    <Input 
                      placeholder={t("search_projects")}
                      className={`h-9 bg-slate-50 text-sm ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                
                <div className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className={isRTL ? "text-right" : "text-left"}>{t("project_name")}</TableHead>
                        <TableHead className={isRTL ? "text-right" : "text-left"}>{t("project_env")}</TableHead>
                        <TableHead className="text-center">{t("project_status")}</TableHead>
                        <TableHead className={isRTL ? "text-left pr-4" : "text-right pl-4"}>{t("assign_action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProjects.map((project) => {
                        const isAssigned = selectedUser.assignedProjectIds.includes(project.id);
                        
                        return (
                          <TableRow key={project.id} className={isAssigned ? "bg-[#f8f9ff]/50" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAssigned ? 'bg-[#38CAF0] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className={`font-bold text-sm ${isAssigned ? 'text-[#0b1c30]' : 'text-slate-600'}`}>
                                    {project.name}
                                  </div>
                                  <div className="text-xs text-slate-400 max-w-[200px] truncate">
                                    {project.description}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-white text-xs font-medium">
                                {project.environment}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                className={`text-[10px] font-semibold border-none px-2 ${
                                  project.status === 'Active' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {project.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={isRTL ? "text-left" : "text-right"}>
                               <Button
                                  variant={isAssigned ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleProject(project.id)}
                                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all shadow-none cursor-pointer ${
                                    isAssigned 
                                    ? "bg-[#00A2D2] text-white hover:bg-red-500 hover:text-white border-none" 
                                    : "bg-white border-slate-200 text-slate-600 hover:border-[#00A2D2] hover:text-[#00A2D2]"
                                  }`}
                                >
                                  {isAssigned ? (
                                    <span className="flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {t("assigned_badge")}
                                    </span>
                                  ) : (
                                    <span>{t("unassigned_badge")}</span>
                                  )}
                                </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {filteredProjects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                            {t("users_empty_search")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              <Card className="border-slate-200/60 shadow-sm flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                <User className="w-16 h-16 mb-4 text-slate-200" />
                <p className="font-medium text-slate-500">{t("select_user")}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {viewTab === "matrix" && (
        <Card className="border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className={`min-w-[200px] border-r border-slate-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t("users_col_user")}
                  </TableHead>
                  {projects.map(project => (
                    <TableHead key={project.id} className="text-center border-r border-slate-100 min-w-[120px]">
                      <div className="font-bold text-[#0b1c30] text-xs">{project.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{project.environment}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50">
                    <TableCell className="border-r border-slate-100 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0">
                          <Image
                            src={user.profileImage || user.photo || "/avatar.png"}
                            alt={user.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-800 font-bold">{user.name}</span>
                          <span className="text-[10px] text-slate-500">{user.role}</span>
                        </div>
                      </div>
                    </TableCell>
                    
                    {projects.map(project => {
                      const isAssigned = user.assignedProjectIds.includes(project.id);
                      return (
                        <TableCell 
                          key={`${user.id}-${project.id}`} 
                          className="text-center border-r border-slate-100 p-1 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            toggleProject(project.id);
                          }}
                        >
                          <div className="flex justify-center">
                            {isAssigned ? (
                              <div className="w-6 h-6 rounded bg-[#e5eeff] text-[#38CAF0] flex items-center justify-center">
                                <Check className="w-4 h-4" strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded border border-slate-200 bg-white hover:border-[#38CAF0] transition-colors" />
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
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
