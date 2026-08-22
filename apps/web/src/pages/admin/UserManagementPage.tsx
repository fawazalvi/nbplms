import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Users, UserPlus, Search, RefreshCw, Lock, Unlock, KeyRound, CheckCircle2, Shield, UserX, UserCheck, X, Edit, Eye, EyeOff } from 'lucide-react';
import { SapIdAutocomplete } from '@/components/appraisal/SapIdAutocomplete';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [message, setMessage] = useState<{ type: 'success' | 'info' | 'error', text: string } | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [employeeSapId, setEmployeeSapId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        api.getUsers(searchTerm),
        api.getAvailableRoles().catch(() => [])
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0].value);
      }
    } catch (e: any) {
      console.error(e);
      setMessage({ type: 'error', text: 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'All') return users;
    return users.filter(u => u.role === roleFilter);
  }, [users, roleFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const locked = users.filter(u => u.isLockedOut).length;
    const admins = users.filter(u => u.role === 'PmwAdmin' || u.role === 'PmwSuperAdmin').length;
    return { total, active, locked, admins };
  }, [users]);

  const resetForm = () => {
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('');
    setEmployeeSapId('');
    if (roles.length > 0) setSelectedRole(roles[0].value);
    setShowPassword(false);
    setEditingUserId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (user: any) => {
    resetForm();
    setEditingUserId(user.id);
    setUsername(user.username || '');
    setFullName(user.fullName || '');
    setEmail(user.email || '');
    setSelectedRole(user.role || (roles.length > 0 ? roles[0].value : ''));
    setEmployeeSapId(user.employeeSapId || '');
    setShowEditModal(true);
  };

  const handleCreateUser = async () => {
    if (!username || !fullName || !password) {
      setMessage({ type: 'error', text: 'Username, Full Name, and Password are required.' });
      return;
    }
    try {
      await api.createUser({
        username,
        fullName,
        email,
        role: selectedRole,
        password,
        employeeSapId,
        actorUserId: 'Admin'
      });
      setMessage({ type: 'success', text: `User account ${fullName} (${username}) created successfully.` });
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error creating user: ${e.message}` });
    }
  };

  const handleEditUser = async () => {
    if (!editingUserId || !fullName) {
      setMessage({ type: 'error', text: 'Full Name is required.' });
      return;
    }
    try {
      await api.updateUser(editingUserId, {
        fullName,
        email,
        role: selectedRole,
        employeeSapId,
        actorUserId: 'Admin'
      });
      setMessage({ type: 'success', text: `User account updated successfully.` });
      setShowEditModal(false);
      resetForm();
      loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error updating user: ${e.message}` });
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.toggleUserStatus(id);
      setMessage({ type: 'success', text: res.message || 'Status toggled.' });
      loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      const res = await api.unlockUser(id);
      setMessage({ type: 'success', text: res.message || 'User unlocked.' });
      loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const res = await api.resetUserPassword(id);
      alert(`Temporary password for ${res.userName}: ${res.tempPassword}`);
      setMessage({ type: 'info', text: `Password reset successful for ${res.userName}.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Identity & Access Administration</span>
            <span>•</span>
            <Badge variant="nbp" className="bg-emerald-800 text-white">PMW Admin & Super Admin</Badge>
          </div>
          <h1 className="text-2xl font-black tracking-tight">System User & Role Management</h1>
          <p className="text-slate-300 text-xs mt-1">
            Manage system user accounts, role provisioning, account lockouts, and admin password resets.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="gold" size="sm" onClick={openCreateModal}>
            <UserPlus className="h-4 w-4 mr-1" />
            Create System User
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between font-semibold ${
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' :
          message.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' :
          'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="opacity-50 hover:opacity-100 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <div className="text-3xl font-black text-slate-800">{stats.total}</div>
            <div className="text-xs font-bold text-slate-500 uppercase">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <div className="text-3xl font-black text-emerald-600">{stats.active}</div>
            <div className="text-xs font-bold text-slate-500 uppercase">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <div className="text-3xl font-black text-red-600">{stats.locked}</div>
            <div className="text-xs font-bold text-slate-500 uppercase">Locked Out</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-center items-center">
            <div className="text-3xl font-black text-purple-600">{stats.admins}</div>
            <div className="text-xs font-bold text-slate-500 uppercase">Admins</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 w-full md:w-96">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search users by Username or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
            <Button
              variant={roleFilter === 'All' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRoleFilter('All')}
              className="whitespace-nowrap"
            >
              All Roles
            </Button>
            {roles.map(r => (
              <Button
                key={r.value}
                variant={roleFilter === r.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter(r.value)}
                className="whitespace-nowrap"
              >
                {r.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Registered System Accounts</CardTitle>
          <CardDescription className="text-xs">Database-driven user records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading system users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Employee Link</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Login</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{u.username}</td>
                      <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                      <td className="p-3"><Badge variant="nbp" className="text-[10px]">{u.role}</Badge></td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{u.employeeSapId || '-'}</td>
                      <td className="p-3 space-x-1">
                        {u.isLockedOut ? (
                          <Badge variant="danger" className="text-[10px]">Locked Out</Badge>
                        ) : u.isActive ? (
                          <Badge variant="success" className="text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                      <td className="p-3 text-right space-x-1">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(u)} title="Edit User">
                          <Edit className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        {u.isLockedOut && (
                          <Button variant="outline" size="sm" onClick={() => handleUnlock(u.id)} title="Unlock Account">
                            <Unlock className="h-3.5 w-3.5 text-emerald-700" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleToggleStatus(u.id)} title={u.isActive ? "Deactivate" : "Activate"}>
                          {u.isActive ? <UserX className="h-3.5 w-3.5 text-red-600" /> : <UserCheck className="h-3.5 w-3.5 text-emerald-700" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleResetPassword(u.id)} title="Reset Password Token">
                          <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-700/40 p-2 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Create System User</h3>
                  <p className="text-[11px] text-slate-300">Identity & Role Provisioning Wizard</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Username (Required)</label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. 98120 or admin" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Full Name (Required)</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Employee Name" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Email (Optional)</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nbp.com.pk" type="email" />
              </div>

              <div>
                <label className="font-bold text-slate-700">Password (Required)</label>
                <div className="relative">
                  <Input 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Enter strong password" 
                    type={showPassword ? "text" : "password"}
                  />
                  <button 
                    type="button" 
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">System Role</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full h-9 px-3 bg-slate-50 border rounded-lg">
                    {roles.map(r => (
                      <option key={r.value} value={r.value} title={r.description}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <SapIdAutocomplete 
                    label="Link Employee SAP ID (Optional)"
                    value={employeeSapId} 
                    onChange={setEmployeeSapId} 
                    placeholder="Search Employee SAP ID"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleCreateUser}>
                Create User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-blue-700/40 p-2 flex items-center justify-center">
                  <Edit className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Edit System User</h3>
                  <p className="text-[11px] text-slate-300">Update Identity & Role details</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-300 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Username (Read-Only)</label>
                  <Input value={username} disabled className="bg-slate-100" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Full Name (Required)</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Employee Name" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nbp.com.pk" type="email" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">System Role</label>
                  <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full h-9 px-3 bg-slate-50 border rounded-lg">
                    {roles.map(r => (
                      <option key={r.value} value={r.value} title={r.description}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <SapIdAutocomplete 
                    label="Link Employee SAP ID"
                    value={employeeSapId} 
                    onChange={setEmployeeSapId} 
                    placeholder="Search Employee SAP ID"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleEditUser}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
