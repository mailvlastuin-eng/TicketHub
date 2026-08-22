import { useState, useEffect, useRef } from 'react';
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
  Ticket,
  X,
  Coins,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Calendar,
  Filter,
  ArrowDown,
  ArrowUp,
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
  renewUserDurationFn,
  updateUserSlotsFn,
  updateUserTokensFn,
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
  const [userSortOption, setUserSortOption] = useState<'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc'>('date-desc');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'pending' | 'expired' | 'terminated'>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'payment-single' | 'payment-multiple' | 'token'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFilterMenuOpen]);

  // Create User Form & Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<'payment' | 'token'>('payment');
  const [newEmail, setNewEmail] = useState('');
  const [newDuration, setNewDuration] = useState<'1m' | '3m' | '6m' | '1y'>('1m');
  const [newPassword, setNewPassword] = useState('');
  const [newLoginMode, setNewLoginMode] = useState<'single' | 'multiple'>('single');
  const [newTokens, setNewTokens] = useState<number>(10);
  const [creatingUser, setCreatingUser] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<any | null>(null);

  // Copy state for individual passwords
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Transfers Count Edit State
  const [editingTransfers, setEditingTransfers] = useState<Record<string, number>>({});
  const [savingTransfers, setSavingTransfers] = useState<Record<string, boolean>>({});

  // Ticket Slots Edit State
  const [editingSlots, setEditingSlots] = useState<Record<string, number>>({});
  const [savingSlots, setSavingSlots] = useState<Record<string, boolean>>({});

  // Tokens Balance Edit State
  const [editingTokens, setEditingTokens] = useState<Record<string, number>>({});
  const [savingTokens, setSavingTokens] = useState<Record<string, boolean>>({});

  // Renew Duration State
  const [renewingUserId, setRenewingUserId] = useState<string | null>(null);
  const [renewDuration, setRenewDuration] = useState<Record<string, '1m' | '3m' | '6m' | '1y'>>({});

  // 1. Authenticate on mount if token exists in persistent storage or session
  useEffect(() => {
    const savedPass = localStorage.getItem('tm_admin_token') || sessionStorage.getItem('tm_admin_token');
    if (savedPass) {
      adminLoginFn({ data: { adminPass: savedPass } })
        .then(() => {
          setAdminPass(savedPass);
          setIsAdmin(true);
          localStorage.setItem('tm_admin_token', savedPass);
        })
        .catch(() => {
          localStorage.removeItem('tm_admin_token');
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
    if (isAdmin && adminPass) {
      getDiagnosticsFn({ data: { adminPass } })
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
      localStorage.setItem('tm_admin_token', adminPass);
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
    localStorage.removeItem('tm_admin_token');
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
          email: newEmail.trim(),
          duration: newDuration,
          password: newPassword.trim() ? newPassword.trim() : undefined,
          loginMode: selectedUserType === 'token' ? 'token' : newLoginMode,
          userType: selectedUserType,
          initialTokens: selectedUserType === 'token' ? Number(newTokens) || 0 : 0,
        },
      });
      toast.success(selectedUserType === 'token' ? `Token User created for ${newEmail}` : `Access generated for ${newEmail}`);
      setLastCreatedUser({
        email: newEmail.trim(),
        password: res.generatedPassword,
        duration: newDuration,
        userType: selectedUserType,
        initialTokens: selectedUserType === 'token' ? Number(newTokens) || 0 : undefined,
      });
      setNewEmail('');
      setNewPassword('');
      setNewLoginMode('single');
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

  const parseDeviceInfo = (deviceInfoStr: string | null) => {
    if (!deviceInfoStr) return { device: '', transfersCount: 0, ticketsCount: 0, ticketSlots: 20, ticketsCreatedCount: 0, tokensCount: 0, userType: 'payment' as 'payment' | 'token', username: '' };
    if (deviceInfoStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(deviceInfoStr);
        const tCount = typeof parsed.ticketsCount === 'number' ? parsed.ticketsCount : 0;
        const tCreated = typeof parsed.ticketsCreatedCount === 'number' ? parsed.ticketsCreatedCount : 0;
        return {
          device: parsed.device || 'Unknown Device',
          transfersCount: typeof parsed.transfersCount === 'number' ? parsed.transfersCount : 0,
          ticketsCount: tCount,
          ticketSlots: typeof parsed.ticketSlots === 'number' ? parsed.ticketSlots : 20,
          ticketsCreatedCount: Math.max(tCreated, tCount),
          tokensCount: typeof parsed.tokensCount === 'number' ? parsed.tokensCount : 0,
          userType: (parsed.userType === 'token' ? 'token' : 'payment') as 'payment' | 'token',
          username: parsed.username || '',
        };
      } catch (e) {}
    }
    return { device: deviceInfoStr, transfersCount: 0, ticketsCount: 0, ticketSlots: 20, ticketsCreatedCount: 0, tokensCount: 0, userType: 'payment' as 'payment' | 'token', username: '' };
  };

  // Filters & Sorting for Access Keys
  const filteredUsers = users
    .filter((u) => {
      // 1. Search Query Filter
      const q = userQuery.toLowerCase().trim();
      const parsedDev = parseDeviceInfo(u.deviceInfo);
      const matchesQuery =
        !q ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (parsedDev.username && parsedDev.username.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      // 2. Status Filter
      if (userStatusFilter !== 'all' && u.status !== userStatusFilter) {
        return false;
      }

      // 3. User Type / Mode Filter
      const isTokenUser = u.userType === 'token' || parsedDev.userType === 'token' || u.loginMode === 'token';
      if (userTypeFilter === 'token' && !isTokenUser) return false;
      if (userTypeFilter === 'payment-single' && (isTokenUser || u.loginMode === 'multiple')) return false;
      if (userTypeFilter === 'payment-multiple' && (isTokenUser || u.loginMode !== 'multiple')) return false;

      return true;
    })
    .sort((a, b) => {
      // 1. Date Created - Newest First (Default)
      if (userSortOption === 'date-desc') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      }
      // 2. Date Created - Oldest First
      if (userSortOption === 'date-asc') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      }
      // 3. Alphabetical Ascending (A -> Z)
      if (userSortOption === 'alpha-asc') {
        const nameA = (a.username || a.email || '').toLowerCase();
        const nameB = (b.username || b.email || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      // 4. Alphabetical Descending (Z -> A)
      if (userSortOption === 'alpha-desc') {
        const nameA = (a.username || a.email || '').toLowerCase();
        const nameB = (b.username || b.email || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

  const isFilterActive = userSortOption !== 'date-desc' || userStatusFilter !== 'all' || userTypeFilter !== 'all';

  const handleResetFilters = () => {
    setUserSortOption('date-desc');
    setUserStatusFilter('all');
    setUserTypeFilter('all');
    setUserQuery('');
  };

  const filteredAttempts = attempts.filter(
    (a) =>
      a.email.toLowerCase().includes(attemptQuery.toLowerCase()) ||
      a.deviceInfo.toLowerCase().includes(attemptQuery.toLowerCase()) ||
      a.status.toLowerCase().includes(attemptQuery.toLowerCase())
  );

  // Hard refresh handler (reloads page while keeping admin authenticated)
  const handleHardRefresh = () => {
    if (adminPass) {
      localStorage.setItem('tm_admin_token', adminPass);
      sessionStorage.setItem('tm_admin_token', adminPass);
    }
    toast.info('Reloading dashboard...');
    window.location.reload();
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

  const handleUpdateSlots = async (userId: string, count: number) => {
    setSavingSlots(prev => ({ ...prev, [userId]: true }));
    try {
      await updateUserSlotsFn({ data: { adminPass, userId, ticketSlots: count } });
      toast.success('Ticket slots updated successfully');
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update ticket slots');
    } finally {
      setSavingSlots(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUpdateTokens = async (userId: string, count: number) => {
    setSavingTokens(prev => ({ ...prev, [userId]: true }));
    try {
      await updateUserTokensFn({ data: { adminPass, userId, tokensCount: count } });
      toast.success('Token balance updated successfully');
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tokens');
    } finally {
      setSavingTokens(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleRenewUser = async (userId: string, email: string) => {
    const duration = renewDuration[userId] || '1m';
    setRenewingUserId(userId);
    try {
      const res = await renewUserDurationFn({ data: { adminPass, userId, duration } });
      const durationLabel = { '1m': '1 Month', '3m': '3 Months', '6m': '6 Months', '1y': '1 Year' }[duration];
      toast.success(`Access renewed for ${email} — expires ${new Date(res.expiresAt).toLocaleDateString()} (+${durationLabel})`);
      fetchDashboardData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to renew access');
    } finally {
      setRenewingUserId(null);
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
        case '1y': return '360 Days (Not Started)';
        default: return 'Pending Login';
      }
    }
    const now = new Date();
    const exp = new Date(u.expiresAt);
    
    // Set both to midnight in local time for clean calendar days comparison
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDate = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
    
    const diffMs = expDate.getTime() - nowDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      if (now > exp) return 'Expired';
      return '0 Days Left (Expires Today)';
    }
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
              onClick={handleHardRefresh}
              className="p-2 border border-slate-200 bg-white rounded-full text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Hard Refresh Dashboard"
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
            diagnostics.dbStatus.toLowerCase().includes('connected') && !diagnostics.dbStatus.toLowerCase().includes('error')
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 backdrop-blur-md' 
              : 'bg-rose-50/80 border-rose-200 text-rose-800 backdrop-blur-md'
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                {diagnostics.dbStatus.toLowerCase().includes('connected') && !diagnostics.dbStatus.toLowerCase().includes('error') ? (
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                ) : (
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
                <div>
                  <p className="text-sm font-bold tracking-tight">
                    {diagnostics.dbStatus.toLowerCase().includes('connected') && !diagnostics.dbStatus.toLowerCase().includes('error')
                      ? 'Connected to database'
                      : 'Error connecting to database'}
                  </p>
                  {diagnostics.dbError && (
                    <p className="text-xs font-mono mt-0.5 opacity-90">{diagnostics.dbError}</p>
                  )}
                </div>
              </div>
            </div>
            {!(diagnostics.dbStatus.toLowerCase().includes('connected') && !diagnostics.dbStatus.toLowerCase().includes('error')) && (
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

        <div className="w-full space-y-6">
          {/* Tab Selector (Pills) */}
          <div className="bg-slate-200/65 border border-slate-200/80 p-1.5 rounded-full flex gap-1.5 max-w-md mx-auto">
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
              {/* Search, Filter & Sort Controls Header */}
              <div className="bg-white border border-slate-200/65 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-850">
                        Granted Access Keys
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/60">
                        {filteredUsers.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Newest keys appear first • Click any account to expand settings
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-60">
                      <input
                        type="text"
                        placeholder="Search key or username..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        className="w-full h-10 border border-slate-200 bg-white text-slate-850 rounded-full pl-10 pr-8 text-xs focus:border-blue-500 focus:shadow-sm outline-none transition-all placeholder:text-slate-400"
                      />
                      <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                      {userQuery && (
                        <button
                          type="button"
                          onClick={() => setUserQuery('')}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* All-in-One Filter & Sort Button with Dropdown */}
                    <div className="relative" ref={filterMenuRef}>
                      <button
                        type="button"
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        className={`h-10 px-3.5 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 ${
                          isFilterActive
                            ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm ring-2 ring-blue-100'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Filter & Sort</span>
                        {isFilterActive && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                          </span>
                        )}
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                            isFilterMenuOpen ? 'rotate-180 text-blue-600' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {isFilterMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-4 text-left animate-in fade-in zoom-in-95 duration-150">
                          {/* Menu Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-blue-600" />
                              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                                Filters & Sorting
                              </span>
                            </div>
                            {isFilterActive && (
                              <button
                                type="button"
                                onClick={handleResetFilters}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                Reset All
                              </button>
                            )}
                          </div>

                          {/* 1. Sort Options */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <ArrowUpDown className="h-3 w-3 text-blue-500" />
                              Sort Order
                            </label>
                            <div className="grid grid-cols-1 gap-1">
                              {[
                                { id: 'date-desc', label: 'Newest First (Date Created ↓)', tag: 'Default' },
                                { id: 'date-asc', label: 'Oldest First (Date Created ↑)', tag: '' },
                                { id: 'alpha-asc', label: 'Alphabetical (A → Z)', tag: 'Ascending' },
                                { id: 'alpha-desc', label: 'Alphabetical (Z → A)', tag: 'Descending' },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setUserSortOption(opt.id as any)}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                    userSortOption === opt.id
                                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80'
                                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {userSortOption === opt.id && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 2. Status Filter */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Activity className="h-3 w-3 text-emerald-500" />
                              Account Status
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: 'all', label: 'All' },
                                { id: 'active', label: 'Active' },
                                { id: 'pending', label: 'Pending' },
                                { id: 'expired', label: 'Expired' },
                                { id: 'terminated', label: 'Terminated' },
                              ].map((st) => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => setUserStatusFilter(st.id as any)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    userStatusFilter === st.id
                                      ? 'bg-slate-900 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 3. Account Type Filter */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Key className="h-3 w-3 text-purple-500" />
                              Account Type
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { id: 'all', label: 'All Types' },
                                { id: 'payment-single', label: 'Single Session' },
                                { id: 'payment-multiple', label: 'Multiple Sign-Ins' },
                                { id: 'token', label: 'Token Users' },
                              ].map((tp) => (
                                <button
                                  key={tp.id}
                                  type="button"
                                  onClick={() => setUserTypeFilter(tp.id as any)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    userTypeFilter === tp.id
                                      ? 'bg-purple-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {tp.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Showing <strong className="text-slate-700">{filteredUsers.length}</strong> of {users.length} keys
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsFilterMenuOpen(false)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Filter Chips Bar */}
                {isFilterActive && (
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Filters:</span>
                    {userSortOption !== 'date-desc' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Sort: {userSortOption === 'date-asc' ? 'Oldest First' : userSortOption === 'alpha-asc' ? 'Alphabetical (A → Z)' : 'Alphabetical (Z → A)'}
                        <button
                          type="button"
                          onClick={() => setUserSortOption('date-desc')}
                          className="hover:text-blue-900 cursor-pointer p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {userStatusFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                        Status: {userStatusFilter}
                        <button
                          type="button"
                          onClick={() => setUserStatusFilter('all')}
                          className="hover:text-emerald-900 cursor-pointer p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {userTypeFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Type: {userTypeFilter === 'token' ? 'Token Users' : userTypeFilter === 'payment-single' ? 'Single Session' : 'Multiple Sign-Ins'}
                        <button
                          type="button"
                          onClick={() => setUserTypeFilter('all')}
                          className="hover:text-purple-900 cursor-pointer p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[11px] text-slate-400 hover:text-slate-700 font-bold underline ml-1 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Card List */}
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="bg-white border border-slate-200/60 rounded-2xl py-12 text-center text-slate-400 font-medium">
                    No access keys match the selected search or filter criteria.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isExpanded = expandedUserId === u.id;
                    const parsedDev = parseDeviceInfo(u.deviceInfo);
                    const isTokenUser = u.userType === 'token' || parsedDev.userType === 'token' || u.loginMode === 'token';
                    const currentTransfers = editingTransfers[u.id] !== undefined ? editingTransfers[u.id] : parsedDev.transfersCount;
                    const isSaving = savingTransfers[u.id];

                    const totalTransferredCount = parsedDev.acceptedTransfers && Array.isArray(parsedDev.acceptedTransfers)
                      ? parsedDev.acceptedTransfers.reduce((acc: number, item: any) => acc + (Array.isArray(item?.seats) ? item.seats.length : 1), 0)
                      : 0;

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
                            <div className="flex items-center gap-2 flex-wrap">
                              {isTokenUser ? (
                                <span className="font-bold text-sm text-slate-900 truncate tracking-tight">
                                  {(u.username || parsedDev.username) ? `@${u.username || parsedDev.username}` : u.email}
                                </span>
                              ) : (
                                <span className="font-bold text-sm text-slate-900 truncate tracking-tight">
                                  {u.email}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getDurationDisplay(u)}
                              </span>
                              {u.createdAt && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500 font-semibold lowercase tracking-normal flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    created {new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {getStatusBadge(u.status)}
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${isTokenUser ? 'text-purple-700 font-extrabold' : u.loginMode === 'multiple' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                {isTokenUser ? 'Token User (Pay Per Use)' : u.loginMode === 'multiple' ? 'Multiple Sign-Ins' : 'Single Session Limit'}
                              </span>
                            </div>
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
                              {/* User Identity Details (Email + Username) */}
                              <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">User Identity</span>
                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                  <p><strong className="text-slate-800">Email:</strong> {u.email}</p>
                                  <p><strong className="text-slate-800">Username:</strong> {(u.username || parsedDev.username) ? `@${u.username || parsedDev.username}` : 'Not set'}</p>
                                </div>
                              </div>

                              {/* Login Mode / Type (Non-Token Users only) */}
                              {!isTokenUser && (
                                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Account Type</span>
                                  <span className={`text-xs font-bold inline-block mt-0.5 uppercase tracking-wide ${u.loginMode === 'multiple' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                    {u.loginMode === 'multiple' ? 'Multiple Sign-Ins' : 'Single Session Limit'}
                                  </span>
                                </div>
                              )}


                              {/* Authorization & Creation Dates */}
                              <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm sm:col-span-2 lg:col-span-1">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Authorization Details</span>
                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                  {u.createdAt && (
                                    <p><strong className="text-slate-800">Created:</strong> {new Date(u.createdAt).toLocaleString()}</p>
                                  )}
                                  {u.activatedAt ? (
                                    <>
                                      <p><strong className="text-slate-800">Started:</strong> {new Date(u.activatedAt).toLocaleString()}</p>
                                      <p><strong className="text-slate-800">Expires:</strong> {new Date(u.expiresAt).toLocaleString()}</p>
                                    </>
                                  ) : (
                                    <p className="text-xs font-semibold text-slate-400 italic">Awaiting buyer login...</p>
                                  )}
                                </div>
                              </div>

                              {/* Tickets Created & Transferred */}
                              <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm text-left">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Tickets Created</span>
                                  <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                    {totalTransferredCount} Transferred Total
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 mt-1.5 text-xs text-slate-700 min-w-0">
                                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                    <Ticket className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                      <p className="font-bold text-sm text-slate-900">
                                        {typeof parsedDev.ticketsCreatedCount === 'number' ? parsedDev.ticketsCreatedCount : (parsedDev.ticketsCount || 0)}
                                      </p>
                                      <span className="text-xs font-bold text-slate-500">
                                        • {totalTransferredCount} Transferred
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                                      {isTokenUser 
                                        ? 'Total tickets created' 
                                        : `${Math.max(0, (parsedDev.ticketSlots ?? 20) - (typeof parsedDev.ticketsCreatedCount === 'number' ? parsedDev.ticketsCreatedCount : (parsedDev.ticketsCount || 0)))} slots left of ${parsedDev.ticketSlots ?? 20}`}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Conditional Balance / Slot Management */}
                              {isTokenUser ? (
                                /* Token Balance Management */
                                <div className="bg-white border border-purple-200 rounded-xl p-3.5 shadow-sm text-left sm:col-span-2">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-[9px] font-extrabold text-purple-700 uppercase tracking-widest block">
                                      Token Balance (2 = Create, 2 = Transfer, 1 = Edit)
                                    </span>
                                    <span className="text-[9px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 shrink-0">
                                      {totalTransferredCount} Transferred Total
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      value={editingTokens[u.id] !== undefined ? editingTokens[u.id] : parsedDev.tokensCount}
                                      onChange={(e) => setEditingTokens(prev => ({ ...prev, [u.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                      className="w-20 h-8 text-center border border-purple-300 rounded-lg bg-purple-50/30 text-purple-950 font-bold focus:outline-none focus:border-purple-500 text-xs"
                                    />
                                    <button
                                      onClick={() => handleUpdateTokens(u.id, editingTokens[u.id] !== undefined ? editingTokens[u.id] : parsedDev.tokensCount)}
                                      disabled={savingTokens[u.id] || (editingTokens[u.id] === undefined && parsedDev.tokensCount === (editingTokens[u.id] ?? parsedDev.tokensCount))}
                                      className="px-3.5 h-8 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                    >
                                      {savingTokens[u.id] ? 'Saving' : 'Save Balance'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Transfers Management */}
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm text-left">
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Transfers Allowance</span>
                                      <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                        {totalTransferredCount} Transferred Total
                                      </span>
                                    </div>
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

                                  {/* Ticket Slots Management */}
                                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm text-left">
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Ticket Slots</span>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <input
                                        type="number"
                                        min="0"
                                        value={editingSlots[u.id] !== undefined ? editingSlots[u.id] : parsedDev.ticketSlots}
                                        onChange={(e) => setEditingSlots(prev => ({ ...prev, [u.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                        className="w-14 h-8 text-center border border-slate-300 rounded-lg bg-white text-slate-800 font-bold focus:outline-none focus:border-blue-500 text-xs"
                                      />
                                      <button
                                        onClick={() => handleUpdateSlots(u.id, editingSlots[u.id] !== undefined ? editingSlots[u.id] : parsedDev.ticketSlots)}
                                        disabled={savingSlots[u.id] || (editingSlots[u.id] === undefined && parsedDev.ticketSlots === (editingSlots[u.id] ?? parsedDev.ticketSlots))}
                                        className="px-3 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center shrink-0"
                                      >
                                        {savingSlots[u.id] ? 'Saving' : 'Save'}
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Expanded Row Action Buttons */}
                            <div className="pt-3 border-t border-slate-100 space-y-3">
                              {/* Renew Access Row */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={renewDuration[u.id] || '1m'}
                                  onChange={(e) => setRenewDuration(prev => ({ ...prev, [u.id]: e.target.value as any }))}
                                  className="h-8 border border-slate-200 bg-white text-slate-800 rounded-lg px-2 text-[10px] font-bold focus:outline-none focus:border-blue-500 uppercase cursor-pointer"
                                >
                                  <option value="1m">+1 Month</option>
                                  <option value="3m">+3 Months</option>
                                  <option value="6m">+6 Months</option>
                                  <option value="1y">+1 Year</option>
                                </select>
                                <button
                                  onClick={() => handleRenewUser(u.id, u.email)}
                                  disabled={renewingUserId === u.id}
                                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {renewingUserId === u.id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                  Renew Access
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {u.status === 'active' && (
                                    <button
                                      onClick={() => handleTerminate(u.id, u.email)}
                                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                                    >
                                      Terminate Session
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete Key
                                  </button>
                                </div>
                              </div>
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

          {/* Attempts Tab */}
          {activeTab === 'attempts' && (
            <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden text-left">
              <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-sm uppercase tracking-wider text-slate-850">
                    Real-Time Security & Sign-In Logs
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Monitored live sign-in attempts across devices</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={attemptQuery}
                    onChange={(e) => setAttemptQuery(e.target.value)}
                    className="w-full h-10 border border-slate-200 bg-white text-slate-850 rounded-full pl-10 pr-4 text-xs focus:border-blue-500 focus:shadow-sm outline-none transition-all"
                  />
                  <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
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

        {/* Floating Action Button for Grant Access */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              setLastCreatedUser(null);
              setIsCreateModalOpen(true);
            }}
            className="group flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 active:scale-95 transition-all cursor-pointer font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
            <span>Grant Access</span>
          </button>
        </div>

        {/* Modal Overlay for Creating User Access */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              onClick={() => setIsCreateModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-left z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">Grant User Access</h3>
                      <p className="text-xs text-slate-400 font-medium">Select account type and configure permissions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* User Type Selector */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserType('payment');
                      setLastCreatedUser(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedUserType === 'payment'
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs uppercase tracking-wider">1. One-Time Payment</span>
                      {selectedUserType === 'payment' && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">Fixed duration with transfer & ticket slot limits</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserType('token');
                      setLastCreatedUser(null);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedUserType === 'token'
                        ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20 text-purple-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs uppercase tracking-wider">2. Token User</span>
                      {selectedUserType === 'token' && <Check className="h-4 w-4 text-purple-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">Pay-per-action (1 token create, 2 tokens transfer)</span>
                  </button>
                </div>

                {/* Create Form */}
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block mb-1.5">
                      User Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full h-11 border border-slate-200 focus:border-blue-500 bg-white text-slate-900 rounded-xl px-4 text-xs placeholder-slate-400 focus:shadow-sm outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block mb-1.5">
                        Duration Limit
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

                    {selectedUserType === 'token' ? (
                      <div>
                        <label className="text-[10px] font-extrabold text-purple-700 uppercase tracking-widest block mb-1.5">
                          Initial Tokens
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="e.g. 10"
                          value={newTokens}
                          onChange={(e) => setNewTokens(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full h-11 border border-purple-200 focus:border-purple-500 bg-purple-50/30 text-purple-950 rounded-xl px-4 text-xs font-bold outline-none transition-all"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block mb-1.5">
                          Login Permission
                        </label>
                        <select
                          value={newLoginMode}
                          onChange={(e) => setNewLoginMode(e.target.value as any)}
                          className="w-full h-11 border border-slate-200 focus:border-blue-500 bg-white text-slate-900 rounded-xl px-3.5 text-xs focus:shadow-sm outline-none transition-all font-semibold"
                        >
                          <option value="single">Single Sign-In (Once)</option>
                          <option value="multiple">Multiple (Reusable)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest block mb-1.5">
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
                    className={`w-full h-11 text-white font-bold text-xs tracking-wider rounded-xl uppercase transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 mt-2 ${
                      selectedUserType === 'token'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
                    }`}
                  >
                    {creatingUser ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {selectedUserType === 'token' ? 'Generate Token Authorization' : 'Generate Payment Authorization'}
                      </>
                    )}
                  </button>
                </form>

                {/* Credentials Box */}
                {lastCreatedUser && (
                  <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl relative overflow-hidden text-left animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                        Authorization Ready!
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                        {lastCreatedUser.userType === 'token' ? 'Token User' : 'One-Time Payment'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-800">
                      <p>
                        <strong className="text-slate-600 font-semibold">Email:</strong> {lastCreatedUser.email}
                      </p>
                      <p>
                        <strong className="text-slate-600 font-semibold">Passcode:</strong>{' '}
                        <span className="font-mono bg-white text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                          {lastCreatedUser.password}
                        </span>
                      </p>
                      <p>
                        <strong className="text-slate-600 font-semibold">Duration:</strong>{' '}
                        {lastCreatedUser.duration === '1m' && '1 Month'}
                        {lastCreatedUser.duration === '3m' && '3 Months'}
                        {lastCreatedUser.duration === '6m' && '6 Months'}
                        {lastCreatedUser.duration === '1y' && '1 Year'}
                      </p>
                      {lastCreatedUser.initialTokens !== undefined && (
                        <p>
                          <strong className="text-slate-600 font-semibold">Tokens:</strong>{' '}
                          <span className="font-bold text-purple-700">{lastCreatedUser.initialTokens} Tokens</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(`${lastCreatedUser.email} | ${lastCreatedUser.password}`, 'last_gen')}
                      className="w-full mt-3 h-9 border border-emerald-300 hover:border-emerald-400 bg-white hover:bg-emerald-100/50 text-emerald-800 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
        )}
      </div>
      <Toaster theme="light" position="bottom-right" closeButton />
    </main>
  );
}
