import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Users, UserPlus, Search, RefreshCw, Lock, Unlock, KeyRound, CheckCircle2, Shield, UserX, UserCheck, X } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sapId, setSapId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState('AVP');
  const [designation, setDesignation] = useState('Senior Officer');
  const [group, setGroup] = useState('Commercial Banking Group');
  const [assignedRole, setAssignedRole] = useState('PmwAdmin');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers(searchTerm);
      setUsers(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!sapId || !fullName) return;
    try {
      await api.createUser({
        sapId,
        fullName,
        email: email || `${sapId}@nbp.com.pk`,
        grade,
        designation,
        reportingGroup: group,
        assignedRole
      });
      setMessage(`User account ${fullName} (${sapId}) created successfully.`);
      setShowCreateModal(false);
      setSapId('');
      setFullName('');
      setEmail('');
      loadUsers();
    } catch (e: any) {
      alert(`Error creating user: ${e.message}`);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await api.toggleUserStatus(id);
      setMessage(res.message);
      loadUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      const res = await api.unlockUser(id);
      setMessage(res.message);
      loadUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      const res = await api.resetUserPassword(id);
      setMessage(`Password reset token generated for ${res.employeeName}: ${res.resetToken}`);
    } catch (e: any) {
      alert(e.message);
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
          <Button variant="secondary" size="sm" onClick={loadUsers}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="gold" size="sm" onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Create System User
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 w-full md:w-96">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search users by SAP ID, Name, or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              className="h-9 text-xs"
            />
          </div>
          <Badge variant="nbp">{users.length} Registered System Users</Badge>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">Registered System Accounts</CardTitle>
          <CardDescription className="text-xs">Database-driven user records from Microsoft SQL Server</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading system users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="p-3">SAP ID</th>
                    <th className="p-3">Full Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Grade & Designation</th>
                    <th className="p-3">Reporting Group</th>
                    <th className="p-3">System Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{u.sapId}</td>
                      <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                      <td className="p-3 text-slate-700">{u.grade} — {u.designation}</td>
                      <td className="p-3 text-slate-500">{u.reportingGroup}</td>
                      <td className="p-3"><Badge variant="nbp" className="text-[10px]">{u.role}</Badge></td>
                      <td className="p-3">
                        {u.isLockedOut ? (
                          <Badge variant="danger" className="text-[10px]">Locked Out</Badge>
                        ) : u.isActive ? (
                          <Badge variant="success" className="text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
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
                  <h3 className="text-base font-bold text-white leading-tight">Create System User Account</h3>
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
                  <label className="font-bold text-slate-700">SAP ID *</label>
                  <Input value={sapId} onChange={(e) => setSapId(e.target.value)} placeholder="e.g. 98120" />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Full Name *</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Employee Name" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Official Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@nbp.com.pk" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Grade</label>
                  <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full h-9 px-3 bg-slate-50 border rounded-lg">
                    <option value="OG III">OG III</option>
                    <option value="OG II">OG II</option>
                    <option value="OG I">OG I</option>
                    <option value="AVP">AVP</option>
                    <option value="VP">VP</option>
                    <option value="SVP">SVP</option>
                    <option value="EVP">EVP</option>
                    <option value="SEVP">SEVP</option>
                    <option value="President/CEO">President/CEO</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">System Role</label>
                  <select value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)} className="w-full h-9 px-3 bg-slate-50 border rounded-lg">
                    <option value="PmwAdmin">PMW Admin</option>
                    <option value="PmwSuperAdmin">PMW Super Admin</option>
                    <option value="GroupPerformanceManager">Group Performance Manager</option>
                    <option value="FirstAppraiser">First Appraiser</option>
                    <option value="SecondAppraiser">Second Appraiser</option>
                    <option value="Employee">Employee</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Reporting Group</label>
                <Input value={group} onChange={(e) => setGroup(e.target.value)} />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="nbp" size="sm" onClick={handleCreateUser}>
                Create User Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
