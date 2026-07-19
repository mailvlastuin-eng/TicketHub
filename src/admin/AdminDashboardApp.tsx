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
} from './functions';

export function AdminDashboardApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);

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

  // Fetch when authorized
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

  const getDeviceIcon = (deviceStr: string) => {
    const lowercase = deviceStr.toLowerCase();
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
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">TicketHub</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-extrabold tracking-wider uppercase ml-2.5">ADMIN</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData(false)}
              disabled={loadingData}
              className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSignOut}
              className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-8">
        {/* Statistics Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Accesses</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
            <p className="text-[10px] text-slate-400 mt-1">Generated login keys</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Sessions</span>
              <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.active}</p>
            <p className="text-[10px] text-slate-400 mt-1">Currently signed-in users</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pending Keys</span>
              <Key className="h-4 w-4 text-amber-550" />
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.pending}</p>
            <p className="text-[10px] text-slate-400 mt-1">Unused code authorizations</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Revoked/Expired</span>
              <Clock className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.terminated + stats.expired}</p>
            <p className="text-[10px] text-slate-400 mt-1">{stats.terminated} terminated, {stats.expired} expired</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Table Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Selector */}
            <div className="bg-slate-200/50 border border-slate-200 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                User Account Access ({filteredUsers.length})
              </button>
              <button
                onClick={() => setActiveTab('attempts')}
                className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'attempts'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Live Login Logs ({filteredAttempts.length})
              </button>
            </div>
                {/* User Accounts Tab */}
            {activeTab === 'users' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
                {/* Table Header Controls */}
                <div className="p-5 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                    Granted Access Keys
                  </h2>
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search email..."
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      className="w-full h-9 border border-slate-200 bg-white text-slate-850 rounded-lg pl-9 pr-4 text-xs focus:border-blue-500 outline-none transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                        <th className="py-3 px-5">User Email</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5">Duration</th>
                        <th className="py-3 px-5">Passcode</th>
                        <th className="py-3 px-5">Login Mode</th>
                        <th className="py-3 px-5">Activation Date</th>
                        <th className="py-3 px-5">Device</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No user access records found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-5 font-medium text-slate-900">
                              {u.email}
                            </td>
                            <td className="py-3.5 px-5">
                              {getStatusBadge(u.status)}
                            </td>
                            <td className="py-3.5 px-5 font-semibold text-slate-700">
                              {u.duration === '1m' && '1 Month'}
                              {u.duration === '3m' && '3 Months'}
                              {u.duration === '6m' && '6 Months'}
                              {u.duration === '1y' && '1 Year'}
                            </td>
                            <td className="py-3.5 px-5 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-bold text-blue-600">
                                  {u.password}
                                </span>
                                <button
                                  onClick={() => handleCopy(`${u.email} | ${u.password}`, u.id)}
                                  className="text-slate-400 hover:text-slate-650 transition-colors"
                                  title="Copy Login Info"
                                >
                                  {copiedId === u.id ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 font-semibold text-slate-700">
                              {u.loginMode === 'multiple' ? (
                                <span className="text-emerald-600">Multiple</span>
                              ) : (
                                <span className="text-blue-600">Single</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-slate-600">
                              {u.activatedAt ? (
                                <div>
                                  <p>{new Date(u.activatedAt).toLocaleDateString()}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">Expires {new Date(u.expiresAt).toLocaleDateString()}</p>
                                </div>
                              ) : (
                                <span className="text-slate-400">Pending Login</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-slate-600 max-w-[120px] truncate">
                              {u.deviceInfo ? (
                                <span className="inline-flex items-center gap-1" title={u.deviceInfo}>
                                  {getDeviceIcon(u.deviceInfo)}
                                  {u.deviceInfo.split('(')[0]}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {u.status === 'active' && (
                                  <button
                                    onClick={() => handleTerminate(u.id, u.email)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-md font-semibold text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                                  >
                                    Terminate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="p-1 text-slate-400 hover:text-rose-600 border border-transparent hover:border-slate-200 rounded-md transition-colors cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Login Logs Tab */}
            {activeTab === 'attempts' && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
                {/* Table Header Controls */}
                <div className="p-5 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                    Live Login Attempts history
                  </h2>
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Search email or device..."
                      value={attemptQuery}
                      onChange={(e) => setAttemptQuery(e.target.value)}
                      className="w-full h-9 border border-slate-200 bg-white text-slate-850 rounded-lg pl-9 pr-4 text-xs focus:border-blue-500 outline-none transition-all"
                    />
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>

                {/* Login History Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
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
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No sign-in attempts registered.
                          </td>
                        </tr>
                      ) : (
                        filteredAttempts.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-5 text-slate-600 font-mono text-[11px]">
                              {new Date(a.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-5 font-semibold text-slate-900">
                              {a.email}
                            </td>
                            <td className="py-3 px-5 font-mono text-slate-800">
                              {a.passwordAttempted}
                            </td>
                            <td className="py-3 px-5">
                              {getAttemptStatusBadge(a.status)}
                            </td>
                            <td className="py-3 px-5 text-slate-600">
                              <span className="inline-flex items-center gap-1.5">
                                {getDeviceIcon(a.deviceInfo)}
                                <span className="max-w-[150px] truncate" title={a.deviceInfo}>
                                  {a.deviceInfo}
                                </span>
                              </span>
                            </td>
                            <td className="py-3 px-5 text-slate-400 font-mono">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800 mb-5 flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                Grant User Access
              </h3>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    User Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@domain.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-[40px] border border-slate-200 bg-white text-slate-900 rounded-lg px-3.5 text-xs placeholder-slate-400 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Access Duration Limit
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value as any)}
                    className="w-full h-[40px] border border-slate-200 bg-white text-slate-900 rounded-lg px-3 text-xs focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="1m">1 Month Access</option>
                    <option value="3m">3 Months Access</option>
                    <option value="6m">6 Months Access</option>
                    <option value="1y">1 Year Access</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Login Permission Mode
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="newLoginMode"
                        checked={newLoginMode === 'single'}
                        onChange={() => setNewLoginMode('single')}
                        className="text-blue-600 focus:ring-blue-500 bg-white border-slate-300"
                      />
                      Single Sign-In (Login Once)
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="newLoginMode"
                        checked={newLoginMode === 'multiple'}
                        onChange={() => setNewLoginMode('multiple')}
                        className="text-blue-600 focus:ring-blue-500 bg-white border-slate-300"
                      />
                      Multiple Sign-Ins
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Passcode (Optional, Auto-Generated if Blank)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. secure1234"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-[40px] border border-slate-200 bg-white text-slate-900 rounded-lg px-3.5 text-xs placeholder-slate-400 focus:border-blue-500 outline-none transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingUser}
                  className="w-full h-[40px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold text-xs tracking-wider rounded-lg uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-2"
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
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-10 w-10 bg-emerald-50 rounded-full blur-md" />
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                    Authorization Generated Successfully!
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-800">
                    <p>
                      <strong className="text-slate-600">Email:</strong> {lastCreatedUser.email}
                    </p>
                    <p>
                      <strong className="text-slate-600">Passcode:</strong>{' '}
                      <span className="font-mono bg-slate-50 text-emerald-750 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                        {lastCreatedUser.password}
                      </span>
                    </p>
                    <p>
                      <strong className="text-slate-600">Duration:</strong>{' '}
                      {lastCreatedUser.duration === '1m' && '1 Month'}
                      {lastCreatedUser.duration === '3m' && '3 Months'}
                      {lastCreatedUser.duration === '6m' && '6 Months'}
                      {lastCreatedUser.duration === '1y' && '1 Year'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopy(`${lastCreatedUser.email} | ${lastCreatedUser.password}`, 'last_gen')}
                    className="w-full mt-3.5 h-[34px] border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 font-semibold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === 'last_gen' ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
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

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                How One-Time Access works
              </h3>
              <div className="space-y-3.5 text-[11px] text-slate-600 leading-relaxed">
                <div className="flex gap-2">
                  <span className="h-5 w-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 font-bold">1</span>
                  <p>When you generate an authorization, it is marked as <strong className="text-slate-800">Pending Login</strong>. The timer has not started yet.</p>
                </div>
                <div className="flex gap-2">
                  <span className="h-5 w-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 font-bold">2</span>
                  <p>The user logs in at the homepage. The status switches to <strong className="text-slate-800">Active Session</strong> and starts their time duration limit.</p>
                </div>
                <div className="flex gap-2">
                  <span className="h-5 w-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 font-bold">3</span>
                  <p>A user cannot sign in a second time using that same passcode, preventing credential sharing or multi-device reuse.</p>
                </div>
                <div className="flex gap-2">
                  <span className="h-5 w-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 font-bold">4</span>
                  <p>To end an active session immediately, click <strong className="text-rose-600">Terminate</strong>. They will be logged out on their next action.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster theme="light" position="bottom-right" closeButton />
    </main>
  );
}
