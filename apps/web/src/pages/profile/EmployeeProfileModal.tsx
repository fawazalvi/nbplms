import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Hash,
  Award
} from 'lucide-react';
import { api, EmployeeProfile, UpdateProfilePayload, LocationItem } from '@/lib/api';
import { HierarchicalLocationSelector } from '@/components/common/HierarchicalLocationSelector';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sapId?: string;
  currentUser?: any;
  onProfileUpdated?: (profile: EmployeeProfile) => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  sapId,
  currentUser,
  onProfileUpdated
}) => {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable fields (Location, Designation, Email)
  const [email, setEmail] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [selectedPsaCode, setSelectedPsaCode] = useState<string | null>(null);
  const [selectedLocationObj, setSelectedLocationObj] = useState<LocationItem | null>(null);

  // Fallback search state
  const [lookupSapId, setLookupSapId] = useState<string>('');

  const targetSapId = (sapId || currentUser?.sapId || currentUser?.username || '84920').trim();

  const loadProfile = async (idToFetch: string) => {
    if (!idToFetch) return;
    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      const data = await api.getEmployeeBySapId(idToFetch);
      setProfile(data);
      setEmail(data.email || '');
      setDesignation(data.designation || '');
      setSelectedPsaCode(data.locationPSACode || null);
      setSelectedLocationObj(data.locationDetails || null);
    } catch (err: any) {
      console.warn('Could not load profile for SAP ID:', idToFetch, err);
      setError(err?.message || `No employee record found for SAP ID "${idToFetch}".`);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLookupSapId(targetSapId);
      loadProfile(targetSapId);
    }
  }, [isOpen, targetSapId]);

  if (!isOpen) return null;

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
      setSuccessMsg('Employee location and profile updated successfully!');
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white px-6 py-4 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-base shadow-inner text-emerald-200">
              {getInitials(profile?.fullName || currentUser?.fullName)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold tracking-tight text-white">
                  {profile ? profile.fullName : 'Employee Profile & Placement'}
                </h2>
                {profile && (
                  <Badge variant="outline" className="bg-emerald-800/80 text-emerald-200 border-emerald-500/40 text-[10px] px-2 py-0.5 font-bold">
                    SAP ID: {profile.sapId}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-emerald-200/80 font-medium">
                National Bank of Pakistan | Strategy & Rewards Division
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/60">
          {/* Feedback Banners */}
          {successMsg && (
            <div className="flex items-center space-x-2.5 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold animate-in slide-in-from-top-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-medium animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p>{error}</p>
                <div className="flex items-center space-x-2 pt-1">
                  <Input
                    placeholder="Enter Employee SAP ID (e.g. 84920)..."
                    value={lookupSapId}
                    onChange={(e) => setLookupSapId(e.target.value)}
                    className="h-8 text-xs bg-white max-w-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadProfile(lookupSapId)}
                    className="h-8 text-xs font-semibold cursor-pointer"
                  >
                    Load Employee
                  </Button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="h-8 w-8 text-emerald-700 animate-spin" />
              <p className="text-xs font-bold text-slate-600">Retrieving official master record and location lineage...</p>
            </div>
          ) : profile ? (
            <>
              {/* 1. Official Master Personnel Record (Read-Only) - Shown ABOVE Location Placeholder */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Official Master Personnel Record
                    </h3>
                  </div>
                  <span className="inline-flex items-center space-x-1 text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md border border-slate-200/60">
                    <Lock className="h-2.5 w-2.5 text-slate-400" />
                    <span>Read-Only Master Data</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Employee Name */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100/70 border border-emerald-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-emerald-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Employee Full Name
                      </span>
                      <p className="text-xs font-extrabold text-slate-900 truncate mt-0.5">
                        {profile.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Official Bank Identity</p>
                    </div>
                  </div>

                  {/* SAP ID */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100/70 border border-blue-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Hash className="h-4 w-4 text-blue-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Employee SAP ID
                      </span>
                      <p className="text-xs font-extrabold text-slate-900 truncate mt-0.5">
                        {profile.sapId}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Primary Enterprise Business Key</p>
                    </div>
                  </div>

                  {/* Grade and Grade Title */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-100/70 border border-purple-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Award className="h-4 w-4 text-purple-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Official Grade & Grade Title
                      </span>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          {getGradeInfo(profile).code}
                        </span>
                        <span className="text-slate-300 font-bold">•</span>
                        <span className="text-xs font-bold text-emerald-800 truncate">
                          {getGradeInfo(profile).title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Corporate Rank Hierarchy</p>
                    </div>
                  </div>

                  {/* Reporting Group (Name followed by Code) */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100/70 border border-amber-200/60 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="h-4 w-4 text-amber-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Reporting Group & Code
                      </span>
                      <p className="text-xs font-extrabold text-slate-900 truncate mt-0.5">
                        {getReportingGroupFormatted(profile)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">Administrative Group Allocation</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Master Location & Branch Linkage (Location Placeholder) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-emerald-700" />
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Master Location & Branch Linkage
                      </h3>
                    </div>
                  </div>
                  <Badge variant="nbp" className="text-[10px]">
                    1,615 Hierarchy Units
                  </Badge>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  Link your employee profile with your primary branch or office using the official 4-digit SAP HR Personnel Sub-Area (`PSACode`).
                </p>

                {/* Hierarchical Selector Component with Search & Tree */}
                <HierarchicalLocationSelector
                  value={selectedPsaCode}
                  onChange={(code, loc) => {
                    setSelectedPsaCode(code);
                    setSelectedLocationObj(loc);
                  }}
                />
              </div>

              {/* 3. Contact & Designation Details (Updateable) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2.5">
                  <Briefcase className="h-4 w-4 text-emerald-700" />
                  <span>Contact & Professional Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Official Designation / Role Title</label>
                    <Input
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Branch Manager"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Official NBP Email</label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="employee@nbp.com.pk"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold cursor-pointer"
          >
            Close
          </Button>

          <Button
            size="sm"
            disabled={saving || loading || !profile}
            onClick={handleSave}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Profile Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EmployeeProfileModal;
