import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  User,
  Mail,
  Briefcase,
  Building2,
  ShieldCheck,
  MapPin,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Search,
  Hash,
  Award
} from 'lucide-react';
import { api, EmployeeProfile, UpdateProfilePayload, LocationItem } from '@/lib/api';
import { HierarchicalLocationSelector } from '@/components/common/HierarchicalLocationSelector';

interface EmployeeProfilePageProps {
  currentUser?: any;
  userRole?: string;
}

export const EmployeeProfilePage: React.FC<EmployeeProfilePageProps> = ({
  currentUser,
  userRole
}) => {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields
  const [email, setEmail] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [selectedPsaCode, setSelectedPsaCode] = useState<string | null>(null);
  const [selectedLocationObj, setSelectedLocationObj] = useState<LocationItem | null>(null);

  // Admin search lookup
  const [lookupSapId, setLookupSapId] = useState<string>(
    currentUser?.sapId || currentUser?.username || '84920'
  );

  const loadProfile = async (sapIdToFetch: string) => {
    if (!sapIdToFetch) return;
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const data = await api.getEmployeeBySapId(sapIdToFetch);
      setProfile(data);
      setEmail(data.email || '');
      setDesignation(data.designation || '');
      setSelectedPsaCode(data.locationPSACode || null);
      setSelectedLocationObj(data.locationDetails || null);
    } catch (err: any) {
      console.warn('Could not load employee profile:', err);
      setError(err?.message || `No employee found for SAP ID "${sapIdToFetch}".`);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = currentUser?.sapId || currentUser?.username || '84920';
    loadProfile(id);
  }, [currentUser]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload: UpdateProfilePayload = {
        email: email.trim(),
        designation: designation.trim(),
        locationPSACode: selectedPsaCode ?? undefined
      };

      const updated = await api.updateEmployeeProfile(profile.sapId, payload);
      setProfile(updated);
      setSuccessMsg('Employee profile and branch location linked successfully!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update employee profile.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'EP';
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Helper for Grade display
  const getGradeInfo = (p: EmployeeProfile) => {
    const code = p.gradeCode || p.grade || 'AVP';
    const title = p.gradeTitle || 'Official Grade';
    return { code, title };
  };

  // Helper for Reporting Group formatted: Name (Code)
  const getReportingGroupFormatted = (p: EmployeeProfile) => {
    if (p.reportingGroupFormatted) return p.reportingGroupFormatted;
    const name = p.reportingGroupName || p.reportingGroup || 'Commercial Banking Group';
    const code = p.reportingGroupCode || '0001';
    return `${name} (${code})`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 rounded-2xl p-6 text-white shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-2xl shadow-inner text-emerald-200">
            {getInitials(profile?.fullName || currentUser?.fullName)}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-black tracking-tight text-white">
                {profile ? profile.fullName : 'My Employee Profile'}
              </h1>
              {profile && (
                <Badge variant="outline" className="bg-emerald-800/80 text-emerald-200 border-emerald-500/40 text-xs px-2.5 py-0.5 font-bold">
                  SAP ID: {profile.sapId}
                </Badge>
              )}
            </div>
            <p className="text-xs text-emerald-200/80 font-medium mt-1">
              National Bank of Pakistan | Strategy & Rewards Division - Performance Management System
            </p>
          </div>
        </div>

        {/* Administrator Lookup Bar */}
        {(userRole === 'PmwSuperAdmin' || userRole === 'PmwAdmin') && (
          <div className="flex items-center space-x-2 bg-emerald-950/70 p-2 rounded-xl border border-emerald-700/60 w-full md:w-auto">
            <Search className="h-4 w-4 text-emerald-300 ml-1" />
            <Input
              placeholder="Search SAP ID..."
              value={lookupSapId}
              onChange={(e) => setLookupSapId(e.target.value)}
              className="h-8 text-xs bg-white text-slate-900 w-36 border-none"
            />
            <Button
              size="sm"
              onClick={() => loadProfile(lookupSapId)}
              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              Lookup
            </Button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center space-x-2.5 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold shadow-2xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start space-x-2.5 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-medium shadow-2xs animate-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Notice</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="h-8 w-8 text-emerald-700 animate-spin" />
          <p className="text-xs font-bold text-slate-600">Retrieving official master record and location hierarchy...</p>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* 1. Official Master Personnel Record (Read-Only) - Shown ABOVE Location Placeholder */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Official Master Personnel Record
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Corporate identity and administrative assignment governed by HR Master Data
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center space-x-1.5 text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-md border border-slate-200">
                <Lock className="h-3 w-3 text-slate-400" />
                <span>Read-Only HR Record</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Employee Full Name */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-5 w-5 text-emerald-800" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Employee Full Name
                  </span>
                  <p className="text-sm font-black text-slate-900 truncate mt-0.5">
                    {profile.fullName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Official Personnel Identity</p>
                </div>
              </div>

              {/* SAP ID */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-blue-100/70 border border-blue-200/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Hash className="h-5 w-5 text-blue-800" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Employee SAP ID
                  </span>
                  <p className="text-sm font-black text-slate-900 truncate mt-0.5">
                    {profile.sapId}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Primary Enterprise Identifier</p>
                </div>
              </div>

              {/* Grade and Grade Title */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-purple-100/70 border border-purple-200/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="h-5 w-5 text-purple-800" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Official Grade & Grade Title
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-sm font-black text-slate-900">
                      {getGradeInfo(profile).code}
                    </span>
                    <span className="text-slate-300 font-bold">•</span>
                    <span className="text-sm font-bold text-emerald-800 truncate">
                      {getGradeInfo(profile).title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Corporate Rank & Executive Band</p>
                </div>
              </div>

              {/* Reporting Group (Name followed by Code) */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-100/70 border border-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="h-5 w-5 text-amber-800" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Reporting Group & Code
                  </span>
                  <p className="text-sm font-black text-slate-900 truncate mt-0.5">
                    {getReportingGroupFormatted(profile)}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Administrative Group Division</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Master Hierarchical Location Linking (Location Placeholder) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <MapPin className="h-5 w-5 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Official Branch / Office Location
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Link your employee profile with the official 4-digit SAP HR Personnel Sub-Area (`PSACode`)
                  </p>
                </div>
              </div>
              <Badge variant="nbp" className="text-xs">
                1,615 Master Hierarchy Units
              </Badge>
            </div>

            {/* Hierarchical Selector with Search & Tree */}
            <HierarchicalLocationSelector
              value={selectedPsaCode}
              onChange={(code, loc) => {
                setSelectedPsaCode(code);
                setSelectedLocationObj(loc);
              }}
            />
          </div>

          {/* 3. Contact & Designation Details (Updateable) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <Briefcase className="h-4 w-4 text-emerald-700" />
                <span>Contact & Designation Details</span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">Self-Service Profile Maintenance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Official Designation / Title</label>
                <Input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Branch Manager"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Official NBP Email Address</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@nbp.com.pk"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Save Action Button Bar */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <Button
              size="lg"
              disabled={saving || loading}
              onClick={handleSave}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-6 py-2.5 shadow-md flex items-center space-x-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Updating Profile...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Profile & Location</span>
                </>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EmployeeProfilePage;
