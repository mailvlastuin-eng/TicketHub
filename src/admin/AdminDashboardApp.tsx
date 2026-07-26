import { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Users,
  Activity,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Copy,
  Check,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Lock,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import {
  adminLoginFn,
  getAdminDashboardDataFn,
  createUserAccessFn,
  terminateUserAccessFn,
  deleteUserAccessFn,
  getDiagnosticsFn,
  updateUserTransfersFn,
} from './functions';

export function AdminDashboardApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Dynamic iOS Add to Home Screen Icon & Manifest Override
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Find existing apple-touch-icon links
    let links = document.querySelectorAll("link[rel='apple-touch-icon']");
    const originalHrefs: string[] = [];
    
    // Store original href values and update them
    links.forEach((link: any) => {
      originalHrefs.push(link.getAttribute("href") || "");
      link.setAttribute("href", "/admin-apple-icon.png");
    });
    
    // If no apple-touch-icon links exist, create one
    if (links.length === 0) {
      const newLink = document.createElement("link");
      newLink.setAttribute("rel", "apple-touch-icon");
      newLink.setAttribute("href", "/admin-apple-icon.png");
      document.head.appendChild(newLink);
    }

    // Find and update manifest links to point to the admin manifest
    let manifests = document.querySelectorAll("link[rel='manifest']");
    const originalManifests: string[] = [];
    manifests.forEach((m: any) => {
      originalManifests.push(m.getAttribute("href") || "");
      m.setAttribute("href", "/admin-manifest.json");
    });
    
    // Dynamic page title update
    const originalTitle = document.title;
    document.title = "AdminHub — Dashboard";
    
    return () => {
      // Revert when leaving the admin page
      document.title = originalTitle;
      
      const currentLinks = document.querySelectorAll("link[rel='apple-touch-icon']");
      currentLinks.forEach((link: any, idx) => {
        if (originalHrefs[idx] !== undefined) {
          link.setAttribute("href", originalHrefs[idx]);
        } else {
          link.remove();
        }
      });

      const currentManifests = document.querySelectorAll("link[rel='manifest']");
      currentManifests.forEach((m: any, idx) => {
        if (originalManifests[idx] !== undefined) {
          m.setAttribute("href", originalManifests[idx]);
        }
      });
    };
  }, []);

  // Dashboard Data
  const [users, setUsers] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    terminated: 0,
    expired: 0,
    totalAttempts: 0,
  });

  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'attempts'>('users');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Search & Filter State
  const [userQuery, setUserQuery] = useState('');
  const [attemptQuery, setAttemptQuery] = useState('');

  // Create User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newDuration, setNewDuration] = useState<'1m' | '3m' | '6m' | '1y'>('1m');
  const [newPassword, setNewPassword] = useState('');
  const [newLoginMode, setNewLoginMode] = useState<'single' | 'multiple'>('single');
  const [creatingUser, setCreatingUser] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<any | null>(null);

  // Copy state for individual passwords
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Transfers Count Edit State
  const [editingTransfers, setEditingTransfers] = useState<Record<string, number>>({});
  const [savingTransfers, setSavingTransfers] = useState<Record<string, boolean>>({});

  // 1. Authenticate on mount if token exists in session
  useEffect(() => {
    const savedPass = sessionStorage.getItem('tm_admin_token');
    if (savedPass) {
      adminLoginFn({ data: { adminPass: savedPass } })
        .then(() => {
          setAdminPass(savedPass);
          setIsAdmin(true);
        })
        .catch(() => {
          sessionStorage.removeItem('tm_admin_token');
        })
        .finally(() => {
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, []);

  // 2. Fetch Dashboard Data
  const fetchDashboardData = async (silent = false) => {
    if (!adminPass) return;
    if (!silent) setLoadingData(true);
    try {
      const data = await getAdminDashboardDataFn({ data: { adminPass } });
      setUsers(data.users);
      setAttempts(data.attempts);
      setStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch dashboard data');
      if (err.message === 'Unauthorized access') {
        handleSignOut();
      }
    } finally {
      if (!silent) setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();

      // Poll every 10 seconds for live updates
      const interval = setInterval(() => {
        fetchDashboardData(true);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isAdmin, adminPass]);

  useEffect(() => {
    if (isAdmin) {
      getDiagnosticsFn()
        .then((res) => setDiagnostics(res))
        .catch((err) => console.error('Failed to load diagnostics:', err));
    }
  }, [isAdmin, adminPass]);

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPass.trim()) return;
    setLoggingIn(true);
    try {
      await adminLoginFn({ data: { adminPass } });
      sessionStorage.setItem('tm_admin_token', adminPass);
      setIsAdmin(true);
      toast.success('Successfully authenticated as Admin');
    } catch (err: any) {
      toast.error(err.message || 'Incorrect admin password');
    } finally {
      setLoggingIn(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    sessionStorage.removeItem('tm_admin_token');
    setAdminPass('');
    setIsAdmin(false);
    toast.info('Signed out of admin dashboard');
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    setCreatingUser(true);
    setLastCreatedUser(null);
    try {
      const res = await createUserAccessFn({
        data: {
          adminPass,
          email: newEmail,
          duration: newDuration,
          password: newPassword ? newPassword : undefined,
          loginMode: newLoginMode,
        },
      });
      toast.success(`Access generated for ${newEmail}`);
      setNewEmail('');
      setNewPassword('');
      setNewLoginMode('single');
      setLastCreatedUser(res.user);
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate access');
    } finally {
      setCreatingUser(false);
    }
  };

  // Terminate Access
  const handleTerminate = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to terminate session and revoke access for ${email}?`)) {
      return;
    }
    try {
      await terminateUserAccessFn({ data: { adminPass, userId } });
      toast.success(`Access terminated for ${email}`);
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to terminate access');
    }
  };

  // Delete User Record
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete all history and record for ${email}?`)) {
      return;
    }
    try {
      await deleteUserAccessFn({ data: { adminPass, userId } });
      toast.success(`Record deleted for ${email}`);
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Credentials copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filters
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(userQuery.toLowerCase())
  );

  const filteredAttempts = attempts.filter(
    (a) =>
      a.email.toLowerCase().includes(attemptQuery.toLowerCase()) ||
      a.deviceInfo.toLowerCase().includes(attemptQuery.toLowerCase()) ||
      a.status.toLowerCase().includes(attemptQuery.toLowerCase())
  );

  const parseDeviceInfo = (deviceInfoStr: string | null) => {
    if (!deviceInfoStr) return { device: '', transfersCount: 0 };
    if (deviceInfoStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(deviceInfoStr);
        return {
          device: parsed.device || 'Unknown Device',
          transfersCount: typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 0
        };
      } catch (e) {}
    }
    return { device: deviceInfoStr, transfersCount: 0 };
  };

  const handleUpdateTransfers = async (userId: string, count: number) => {
    setSavingTransfers(prev => ({ ...prev, [userId]: true }));
    try {
      await updateUserTransfersFn({ data: { adminPass, userId, transfersCount: count } });
      toast.success('Transfer count updated successfully');
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update transfers');
    } finally {
      setSavingTransfers(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getDeviceIcon = (deviceStr: string) => {
    const parsed = parseDeviceInfo(deviceStr);
    const lowercase = parsed.device.toLowerCase();
    if (lowercase.includes('mobile') || lowercase.includes('phone')) return <Smartphone className="h-4 w-4" />;
    if (lowercase.includes('tablet') || lowercase.includes('ipad')) return <Tablet className="h-4 w-4" />;
    if (lowercase.includes('desktop') || lowercase.includes('macintosh') || lowercase.includes('windows')) return <Monitor className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Session
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Pending Login
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Expired
          </span>
        );
      case 'terminated':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Terminated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400">
            {status}
          </span>
        );
    }
  };

  const getDurationDisplay = (u: any) => {
    if (u.status === 'expired') return 'Expired';
    if (u.status === 'terminated') return 'Terminated';
    if (!u.activatedAt) {
      switch (u.duration) {
        case '1m': return '30 Days (Not Started)';
        case '3m': return '90 Days (Not Started)';
        case '6m': return '180 Days (Not Started)';
        case '1y': return '365 Days (Not Started)';
        default: return 'Pending Login';
      }
    }
    const now = new Date();
    const exp = new Date(u.expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} Day${diffDays !== 1 ? 's' : ''} Left`;
  };

  const getAttemptStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Success
          </span>
        );
      case 'blocked_already_active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Blocked - Session Active
          </span>
        );
      case 'blocked_expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-700">
            <Clock className="h-3 w-3" />
            Blocked - Expired
          </span>
        );
      case 'blocked_terminated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400">
            <XCircle className="h-3 w-3" />
            Blocked - Terminated
          </span>
        );
      case 'failed_incorrect_password':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-500/20 text-rose-300">
            <Lock className="h-3 w-3" />
            Incorrect Password
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-500/10 text-zinc-400">
            {status}
          </span>
        );
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="mt-4 text-sm text-slate-500 font-semibold">Authenticating administrator...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden select-none">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-blue-100 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-pink-100/60 blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative z-10">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-slate-900 text-2xl font-black tracking-tight uppercase">
              Admin Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Enter admin key to access the control panel.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
                Administrator Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full h-[46px] border border-slate-300 bg-white text-slate-900 rounded-lg pl-10 pr-4 text-[16px] md:text-sm placeholder-slate-400 focus:border-blue-500 outline-none transition-all"
                />
                <Key className="absolute left-3.5 top-[15px] h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xs tracking-wider py-[14px] rounded-lg uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loggingIn ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        </div>
        <Toaster theme="light" position="bottom-right" closeButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30 text-slate-800 pb-24 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Header with iOS notch support */}
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-xl sticky top-0 z-40 shadow-sm pt-[calc(16px+env(safe-area-inset-top,0px))]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">TicketHub</span>
              <span className="text-[9px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full font-black tracking-widest uppercase ml-2.5 shadow-sm">ADMIN</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDashboardData(false)}
              disabled={loadingData}
              className="p-2 border border-slate-200 bg-white rounded-full text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSignOut}
              className="h-10 px-5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {/* Database Status Banner */}
        {diagnostics && (
          <div className={`mb-8 p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
            diagnostics.dbStatus.includes('Connected') 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 backdrop-blur-md' 
              : 'bg-rose-50/80 border-rose-200 text-rose-800 backdrop-blur-md'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${
                diagnostics.dbStatus.includes('Connected') ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {diagnostics.dbStatus.includes('Connected') ? (
                  <CheckCircle2 className="h-5.5 w-5.5" />
                ) : (
                  <AlertTriangle className="h-5.5 w-5.5" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight">{diagnostics.dbStatus}</p>
                {diagnostics.dbError ? (
                  <p className="text-xs font-mono mt-0.5 opacity-90">{diagnostics.dbError}</p>
                ) : (
                  <p className="text-xs opacity-80 font-medium">Database Project: {diagnostics.projectId}</p>
                )}
              </div>
            </div>
            {!diagnostics.dbStatus.includes('Connected') && (
              <span className="text-[9px] font-black tracking-widest bg-rose-200 text-rose-800 px-3 py-1 rounded-full uppercase shadow-sm">
                Config Error
              </span>
            )}
          </div>
        )}

        {/* Statistics Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Total Keys</span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-full"><Users className="h-4.5 w-4.5" /></div>
            </div>
            <p className="text-3xl font-black text-slate-900 leading-tight">{stats.total}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Generated authorizations</p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Active Keys</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-full"><Activity className="h-4.5 w-4.5 animate-pulse" /></div>
            </div>
            <p className="text-3xl font-black text-slate-900 leading-tight">{stats.active}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Currently signed-in users</p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Pending Login</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-full"><Key className="h-4.5 w-4.5" /></div>
            </div>
            <p className="text-3xl font-black text-slate-900 leading-tight">{stats.pending}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Unused code authorizations</p>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-rose-500/5 rounded-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Expired / Revoked</span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-full"><Clock className="h-4.5 w-4.5" /></div>
            </div>
            <p className="text-3xl font-black text-slate-900 leading-tight">{stats.terminated + stats.expired}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">{stats.terminated} revoked, {stats.expired} expired</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Selector (Pills) */}
            <div className="bg-slate-200/65 border border-slate-200/80 p-1.5 rounded-full flex gap-1.5">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-2.5 text-center rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-white text-blue-600 shadow-md shadow-slate-300/40 border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Access Keys ({filteredUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('attempts')}
                className={`flex-1 py-2.5 text-center rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  activeTab === 'attempts'
                    ? 'bg-white text-blue-600 shadow-md shadow-slate-300/40 border border-slate-200/10'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign-In Logs ({filteredAttempts.length})
              </button>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* Search and Header Controls */}
                <div className="bg-white border border-slate-200/65 rounded-2xl p-5 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-col text-left">
                    <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-850">
                      Granted Access Keys
                    </h2>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Click any account to expand settings and detail info</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search key email..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      className="w-full h-10 border border-slate-200 bg-white text-slate-850 rounded-full pl-10 pr-4 text-xs focus:border-blue-500 focus:shadow-sm outline-none transition-all"
                    />
                    <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Collapsible Card List */}
                <div className="space-y-3">
                  {filteredUsers.length === 0 ? (
                    <div className="bg-white border border-slate-200/60 rounded-2xl py-12 text-center text-slate-400 font-medium">
                      No access keys registered.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isExpanded = expandedUserId === u.id;
                      const parsedDev = parseDeviceInfo(u.deviceInfo);
                      const currentTransfers = editingTransfers[u.id] !== undefined ? editingTransfers[u.id] : parsedDev.transfersCount;
                      const isSaving = savingTransfers[u.id];

                      return (
                        <div 
                          key={u.id} 
                          className={`bg-white border rounded-2xl shadow-sm transition-all duration-200 overflow-hidden ${
                            isExpanded ? 'border-blue-300 ring-2 ring-blue-5/50 shadow-md' : 'border-slate-200/60 hover:border-slate-300'
                          }`}
                        >
                          {/* Compact View Header */}
                          <div 
                            onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                            className="p-5 flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex flex-col text-left min-w-0 pr-4">
                              <span className="font-bold text-sm text-slate-900 truncate tracking-tight">{u.email}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {getDurationDisplay(u)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {getStatusBadge(u.status)}
                              <div className={`p-1 text-slate-400 hover:text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"></path>
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/60 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                                {/* Passcode Detail */}
                                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Passcode</span>
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-black text-sm text-blue-600 bg-blue-50/30 px-2 py-0.5 rounded border border-blue-100">{u.password}</span>
                                    <button
                                      onClick={() => handleCopy(`${u.email} | ${u.password}`, u.id)}
                                      className="p-1 text-slate-400 hover:text-blue-600 active:scale-95 transition-all cursor-pointer"
                                      title="Copy Credentials"
                                    >
                                      {copiedId === u.id ? (
                                        <Check className="h-4 w-4 text-emerald-600" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Login Mode */}
                                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Login Permission</span>
                                  <span className={`text-xs font-bold inline-block mt-0.5 uppercase tracking-wide ${u.loginMode === 'multiple' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                    {u.loginMode === 'multiple' ? 'Multiple Sign-Ins' : 'Single Session Limit'}
                                  </span>
                                </div>

                                {/* Activation Dates */}
                                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm sm:col-span-2 lg:col-span-1">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Authorization Details</span>
                                  {u.activatedAt ? (
                                    <div className="text-[11px] text-slate-600 space-y-0.5">
                                      <p><strong className="text-slate-800">Started:</strong> {new Date(u.activatedAt).toLocaleString()}</p>
                                      <p><strong className="text-slate-800">Expires:</strong> {new Date(u.expiresAt).toLocaleString()}</p>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400 italic">Awaiting buyer login...</span>
                                  )}
                                </div>

                                {/* Connected Device */}
                                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm sm:col-span-2">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Registered Device</span>
                                  {u.deviceInfo ? (
                                    <div className="flex items-start gap-2.5 mt-1 text-xs text-slate-700 min-w-0">
                                      <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg mt-0.5 shrink-0">
                                        {getDeviceIcon(u.deviceInfo)}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold truncate">{parsedDev.device}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">Device user string registered</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-450 italic">No device bound yet</span>
                                  )}
                                </div>

                                {/* Transfers Management */}
                                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm text-left">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Transfers Allowance</span>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentTransfers}
                                      onChange={(e) => setEditingTransfers(prev => ({ ...prev, [u.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                      className="w-14 h-8 text-center border border-slate-300 rounded-lg bg-white text-slate-800 font-bold focus:outline-none focus:border-blue-500 text-xs"
                                    />
                                    <button
                                      onClick={() => handleUpdateTransfers(u.id, currentTransfers)}
                                      disabled={isSaving || (editingTransfers[u.id] === undefined && parsedDev.transfersCount === currentTransfers)}
                                      className="px-3 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    >
                                      {isSaving ? 'Saving' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Row Action Buttons */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {u.status === 'active' && (
                                    <button
                                      onClick={() => handleTerminate(u.id, u.email)}
                                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-600 border border-rose-200 rounded-full font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all"
                                    >
                                      Terminate Session
                                    </button>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-100 border border-slate-200 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                                  title="Delete Record"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete Key
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Login Logs Tab */}
            {activeTab === 'attempts' && (
              <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                  <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                    Live Login Attempts History
                  </h2>
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search email or device..."
                      value={attemptQuery}
                      onChange={(e) => setAttemptQuery(e.target.value)}
                      className="w-full h-10 border border-slate-200 bg-white text-slate-855 rounded-full pl-10 pr-4 text-xs focus:border-blue-500 outline-none transition-all"
                    />
                    <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">
                        <th className="py-3 px-5">Date & Time</th>
                        <th className="py-3 px-5">Target User</th>
                        <th className="py-3 px-5">Password Tried</th>
                        <th className="py-3 px-5">Outcome</th>
                        <th className="py-3 px-5">Device</th>
                        <th className="py-3 px-5">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredAttempts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                            No sign-in attempts registered.
                          </td>
                        </tr>
                      ) : (
                        filteredAttempts.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-5 text-slate-500 font-mono text-[10.5px]">
                              {new Date(a.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-5 font-bold text-slate-900">
                              {a.email}
                            </td>
                            <td className="py-3.5 px-5 font-mono text-slate-800 font-semibold bg-slate-50/40">
                              {a.passwordAttempted}
                            </td>
                            <td className="py-3.5 px-5">
                              {getAttemptStatusBadge(a.status)}
                            </td>
                            <td className="py-3.5 px-5 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-slate-400">{getDeviceIcon(a.deviceInfo)}</span>
                                <span className="max-w-[140px] truncate" title={a.deviceInfo}>
                                  {a.deviceInfo}
                                </span>
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-slate-400 font-mono">
                              {a.ip}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Creation Form Column */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm relative overflow-hidden text-left">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 mb-5 flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Grant User Access
              </h3>

              <form onSubmit={handleCreateUser} className="space-y-5">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block mb-2">
                    User Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="buyer@domain.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-11 border border-slate-200 focus:border-blue-500 bg-white text-slate-900 rounded-xl px-4 text-xs placeholder-slate-400 focus:shadow-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block mb-2">
                    Access Duration Limit
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value as any)}
                    className="w-full h-11 border border-slate-200 focus:border-blue-500 bg-white text-slate-900 rounded-xl px-3.5 text-xs focus:shadow-sm outline-none transition-all font-semibold"
                  >
                    <option value="1m">1 Month Access</option>
                    <option value="3m">3 Months Access</option>
                    <option value="6m">6 Months Access</option>
                    <option value="1y">1 Year Access</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block mb-2">
                    Login Permission Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewLoginMode('single')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        newLoginMode === 'single'
                          ? 'bg-blue-50 border-blue-500 text-blue-750 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-extrabold uppercase tracking-wider text-[10px]">Single Sign-In</span>
                      <span className="text-[9px] text-slate-450 font-semibold">Login Once Max</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLoginMode('multiple')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        newLoginMode === 'multiple'
                          ? 'bg-blue-50 border-blue-500 text-blue-755 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-extrabold uppercase tracking-wider text-[10px]">Multiple</span>
                      <span className="text-[9px] text-slate-450 font-semibold">Reusable session</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-650 uppercase tracking-widest block mb-2">
                    Passcode (Optional, auto-generated if blank)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. secure1234"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-11 border border-slate-200 focus:border-blue-500 bg-white text-slate-900 rounded-xl px-4 text-xs placeholder-slate-400 focus:shadow-sm outline-none transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingUser}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs tracking-wider rounded-full uppercase transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 mt-4"
                >
                  {creatingUser ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Generate Authorization
                    </>
                  )}
                </button>
              </form>

              {/* Show password immediately upon generation */}
              {lastCreatedUser && (
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-10 w-10 bg-emerald-50 rounded-full blur-md" />
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2">
                    Authorization Generated Successfully!
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-800">
                    <p>
                      <strong className="text-slate-650 font-semibold">Email:</strong> {lastCreatedUser.email}
                    </p>
                    <p>
                      <strong className="text-slate-650 font-semibold">Passcode:</strong>{' '}
                      <span className="font-mono bg-white text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                        {lastCreatedUser.password}
                      </span>
                    </p>
                    <p>
                      <strong className="text-slate-650 font-semibold">Duration:</strong>{' '}
                      {lastCreatedUser.duration === '1m' && '1 Month'}
                      {lastCreatedUser.duration === '3m' && '3 Months'}
                      {lastCreatedUser.duration === '6m' && '6 Months'}
                      {lastCreatedUser.duration === '1y' && '1 Year'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(`${lastCreatedUser.email} | ${lastCreatedUser.password}`, 'last_gen')}
                    className="w-full mt-4 h-9 border border-emerald-250 hover:border-emerald-350 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === 'last_gen' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-700" />
                        Copied Credentials
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Credentials
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toaster theme="light" position="bottom-right" closeButton />
    </main>
  );
}
