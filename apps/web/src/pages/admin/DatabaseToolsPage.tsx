import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Database,
  RefreshCw,
  Trash2,
  Sparkles,
  AlertTriangle,
  Building2,
  GraduationCap,
  Users,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileCheck,
  CheckCircle2,
  XCircle,
  Shield,
  Mail,
  Lock,
  KeyRound,
  Wrench,
  Search,
  Check,
  X
} from 'lucide-react';
import { api } from '@/lib/api';

interface DatabaseToolsPageProps {
  userRole?: string;
}

interface EntityDef {
  key: string;
  name: string;
  tableName: string;
  category: 'master' | 'cycles' | 'forms' | 'system';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  countKey: string;
  seedable: boolean;
  cleanable: boolean;
  dependentNote?: string;
}

const ENTITY_REGISTRY: EntityDef[] = [
  // Master Governance
  {
    key: 'groups',
    name: 'Master Reporting Groups',
    tableName: 'dbo.ReportingGroups',
    category: 'master',
    icon: Building2,
    description: 'NBP Master 8 Business Groups with 4-digit leading-zero RPSA codes (0001–0008).',
    countKey: 'reportingGroupsCount',
    seedable: true,
    cleanable: true
  },
  {
    key: 'grades',
    name: 'Master ESG Grade Hierarchy',
    tableName: 'dbo.GradeMappings',
    category: 'master',
    icon: GraduationCap,
    description: 'Executive Seniority Grades 01–09 (OG III to President/CEO) and form mapping rules.',
    countKey: 'gradeMappingsCount',
    seedable: true,
    cleanable: true
  },
  {
    key: 'employees',
    name: 'Master Employee Directory',
    tableName: 'dbo.Employees',
    category: 'master',
    icon: Users,
    description: 'Bank-wide employee records, SAP IDs, supervisor hierarchy lines, and MRT/MRC flags.',
    countKey: 'employeesCount',
    seedable: true,
    cleanable: true,
    dependentNote: 'Cleans dependent appraisal form scores and cycle assignments automatically.'
  },

  // Appraisal Cycles & Sandboxes
  {
    key: 'cycles',
    name: 'Appraisal Cycles & Sandboxes',
    tableName: 'dbo.AppraisalCycles',
    category: 'cycles',
    icon: Calendar,
    description: 'Annual evaluation cycles (2026, 2027), calendar stages, and cycle configurations.',
    countKey: 'cyclesCount',
    seedable: true,
    cleanable: true,
    dependentNote: 'Clears all enrolled staff, frozen groups/grades, objectives, and cycle scores.'
  },
  {
    key: 'cycle-roster',
    name: 'Cycle Enrolled Staff Roster',
    tableName: 'dbo.EmployeeCycles',
    category: 'cycles',
    icon: Users,
    description: 'Enrolled employee records snapshotted into specific appraisal cycles.',
    countKey: 'employeeCyclesCount',
    seedable: false,
    cleanable: false,
    dependentNote: 'Managed via Cycle Snapshot & Rosters workspace.'
  },
  {
    key: 'cycle-groups',
    name: 'Cycle Frozen Reporting Groups',
    tableName: 'dbo.CycleReportingGroups',
    category: 'cycles',
    icon: Layers,
    description: 'Reporting groups snapshot isolated and frozen per appraisal cycle.',
    countKey: 'cycleReportingGroupsCount',
    seedable: false,
    cleanable: false
  },
  {
    key: 'cycle-grades',
    name: 'Cycle Frozen ESG Grades',
    tableName: 'dbo.CycleGradeMappings',
    category: 'cycles',
    icon: Layers,
    description: 'ESG grades snapshot isolated and frozen per appraisal cycle.',
    countKey: 'cycleGradeMappingsCount',
    seedable: false,
    cleanable: false
  },
  {
    key: 'bellcurve',
    name: 'Bell Curve Distribution Policies',
    tableName: 'dbo.BellCurvePolicies',
    category: 'cycles',
    icon: Building2,
    description: 'Grade-wise and bank-wide rating quota policies (Outstanding 5-10%, Very Good 20-25%, etc.).',
    countKey: 'bellCurvePoliciesCount',
    seedable: true,
    cleanable: true
  },

  // Forms & Workflows
  {
    key: 'forms',
    name: 'Appraisal Form Templates',
    tableName: 'dbo.FormTemplates',
    category: 'forms',
    icon: FileSpreadsheet,
    description: 'KPI 70/30 Template, 4-Perspective Balanced Scorecard, and Risk-Adjusted BSC.',
    countKey: 'formTemplatesCount',
    seedable: true,
    cleanable: true
  },
  {
    key: 'objectives',
    name: 'Form Objectives & Key Results',
    tableName: 'dbo.Objectives',
    category: 'forms',
    icon: FileCheck,
    description: 'SMART goals, KPIs, targets, and employee weightage distributions.',
    countKey: 'objectivesCount',
    seedable: false,
    cleanable: false,
    dependentNote: 'Cleared when cleaning Appraisal Cycles or Form Templates.'
  },
  {
    key: 'traits',
    name: 'Behavioural Competency Traits',
    tableName: 'dbo.BehaviourTraits',
    category: 'forms',
    icon: FileCheck,
    description: 'Core NBP behavioural traits and values evaluation entries.',
    countKey: 'traitsCount',
    seedable: false,
    cleanable: false
  },
  {
    key: 'scores',
    name: 'Encrypted Appraisal Scores',
    tableName: 'dbo.Scores',
    category: 'forms',
    icon: Lock,
    description: 'AES-256-GCM encrypted evaluation scores, appraiser ratings, and private remarks.',
    countKey: 'scoresCount',
    seedable: false,
    cleanable: false
  },
  {
    key: 'development',
    name: 'Development & Training Reviews',
    tableName: 'dbo.DevelopmentReviews',
    category: 'forms',
    icon: GraduationCap,
    description: 'Employee strengths, growth areas, training needs, and supervisor comments.',
    countKey: 'developmentReviewsCount',
    seedable: false,
    cleanable: false
  },
  {
    key: 'disagreements',
    name: 'Employee Disagreement Cases',
    tableName: 'dbo.DisagreementCases',
    category: 'forms',
    icon: AlertTriangle,
    description: 'Form result disagreements, justifications, GPM reviews, and PMW resolutions.',
    countKey: 'disagreementCasesCount',
    seedable: false,
    cleanable: false
  },

  // System, Users & Security
  {
    key: 'users',
    name: 'System Portal User Accounts',
    tableName: 'dbo.SystemUsers',
    category: 'system',
    icon: Users,
    description: 'Authentication logins, BCrypt hashed passwords, and assigned RBAC security roles.',
    countKey: 'systemUsersCount',
    seedable: true,
    cleanable: true,
    dependentNote: 'Cleans employee login accounts while safely preserving system superadmin.'
  },
  {
    key: 'email',
    name: 'Email & SMTP Configurations',
    tableName: 'dbo.EmailConfigurations',
    category: 'system',
    icon: Mail,
    description: 'Exchange / SMTP host, port, TLS security, credentials, and sender profiles.',
    countKey: 'emailConfigurationsCount',
    seedable: true,
    cleanable: true
  },
  {
    key: 'keys',
    name: 'Encryption Key Versions',
    tableName: 'dbo.KeyVersions',
    category: 'system',
    icon: KeyRound,
    description: 'KMS key references and encryption rotation version descriptors.',
    countKey: 'keyVersionsCount',
    seedable: false,
    cleanable: false
  },
  {
    key: 'audit',
    name: 'Audit Trail & Change Logs',
    tableName: 'dbo.AuditEvents',
    category: 'system',
    icon: Shield,
    description: 'Immutable system compliance events and field-level change history logs.',
    countKey: 'auditEventsCount',
    seedable: false,
    cleanable: true,
    dependentNote: 'Purges all system audit records and form field modification logs.'
  }
];

export const DatabaseToolsPage: React.FC<DatabaseToolsPageProps> = ({ userRole = 'PmwSuperAdmin' }) => {
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [entityToClean, setEntityToClean] = useState<EntityDef | null>(null);
  const [showFullPurgeModal, setShowFullPurgeModal] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getDbStatus();
      setDbStatus(data);
    } catch (e: any) {
      console.error(e);
      setMessage({ text: 'Failed to load database metrics: ' + (e.message || 'Network error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleFullSeed = async () => {
    if (!window.confirm('Execute 1-Click Full Database Seed? This will reset and populate standard NBP master data, sample employees across all ESG grades, active appraisal cycles, templates, and users.')) {
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.seedDb('PmwSuperAdmin');
      setMessage({ text: res.message || 'Database successfully seeded with standard NBP enterprise data.', type: 'success' });
      await loadStatus();
    } catch (e: any) {
      setMessage({ text: e.message || 'Full database seed failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFullPurge = async () => {
    if (purgeConfirmationText !== 'PURGE-DATABASE') {
      setMessage({ text: 'Confirmation code does not match "PURGE-DATABASE". Action aborted.', type: 'error' });
      return;
    }
    setActionLoading(true);
    setMessage(null);
    setShowFullPurgeModal(false);
    setPurgeConfirmationText('');
    try {
      const res = await api.cleanDb('PmwSuperAdmin');
      setMessage({ text: res.message || 'Database completely cleaned and reset.', type: 'success' });
      await loadStatus();
    } catch (e: any) {
      setMessage({ text: e.message || 'Full database clean failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedEntity = async (entity: EntityDef) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.seedEntity(entity.key, 'PmwSuperAdmin');
      setMessage({ text: res.message || `Successfully seeded ${entity.name}.`, type: 'success' });
      await loadStatus();
    } catch (e: any) {
      setMessage({ text: e.message || `Failed to seed ${entity.name}.`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCleanEntity = async (entity: EntityDef) => {
    setActionLoading(true);
    setMessage(null);
    setEntityToClean(null);
    try {
      const res = await api.cleanEntity(entity.key, 'PmwSuperAdmin');
      setMessage({ text: res.message || `Successfully purged ${entity.name}.`, type: 'success' });
      await loadStatus();
    } catch (e: any) {
      setMessage({ text: e.message || `Failed to clean ${entity.name}.`, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMigrateSchema = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.migrateSchema('PmwSuperAdmin');
      setMessage({ text: res.message || 'Schema migration and integrity repair completed.', type: 'success' });
      await loadStatus();
    } catch (e: any) {
      setMessage({ text: e.message || 'Schema migration failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredEntities = ENTITY_REGISTRY.filter((ent) => {
    const matchesCat = activeCategory === 'all' || ent.category === activeCategory;
    const matchesSearch =
      ent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalRecords = dbStatus
    ? Object.keys(dbStatus)
        .filter((k) => k.endsWith('Count'))
        .reduce((sum, k) => sum + (dbStatus[k] || 0), 0)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Super Admin Access Security Guard */}
      {userRole !== 'PmwSuperAdmin' && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Restricted Governance Zone</h4>
            <p className="text-xs">Database tools and entity seeding controls are restricted exclusively to PMW Super Admin.</p>
          </div>
        </div>
      )}

      {/* Hero Database Status Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-mono font-bold">
                <Database className="h-3 w-3 mr-1" />
                SQL SERVER 2022 (DEV_DB)
              </Badge>
              <Badge className="bg-white/10 text-white border-white/20 text-xs">
                SUPERADMIN SCOPE ONLY
              </Badge>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>Database Administration & Entity Seeder Suite</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Centrally manage, monitor, selectively seed, and cleanly purge database tables across Master Data, Appraisal Cycles, Form Templates, User Logins, and Audit Logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading || loading}
              onClick={loadStatus}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs font-bold h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Metrics
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={handleMigrateSchema}
              className="bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800 border-emerald-500/40 text-xs font-bold h-9"
            >
              <Wrench className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Repair Schema & Deduplicate
            </Button>

            <Button
              variant="nbp"
              size="sm"
              disabled={actionLoading}
              onClick={handleFullSeed}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg h-9 px-4"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              1-Click Full DB Seed
            </Button>

            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={() => setShowFullPurgeModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg h-9 px-4"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Wipe Database
            </Button>
          </div>
        </div>

        {/* Real-time DB Health Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-white/10 mt-6 pt-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Stored Records</div>
            <div className="text-xl font-black text-white mt-0.5">{totalRecords}</div>
            <div className="text-[10px] text-emerald-400 font-medium">Across 18 tables</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Master Governance</div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">
              {(dbStatus?.reportingGroupsCount || 0) + (dbStatus?.gradeMappingsCount || 0) + (dbStatus?.employeesCount || 0)}
            </div>
            <div className="text-[10px] text-slate-300">Groups, Grades & Staff</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cycle Records</div>
            <div className="text-xl font-black text-cyan-300 mt-0.5">
              {(dbStatus?.cyclesCount || 0) + (dbStatus?.employeeCyclesCount || 0)}
            </div>
            <div className="text-[10px] text-slate-300">Cycles & Snapshots</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Users & Audit</div>
            <div className="text-xl font-black text-amber-300 mt-0.5">
              {(dbStatus?.systemUsersCount || 0) + (dbStatus?.auditEventsCount || 0)}
            </div>
            <div className="text-[10px] text-slate-300">Logins & Audit logs</div>
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <XCircle className="h-4 w-4 text-rose-700" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeCategory === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Entities ({ENTITY_REGISTRY.length})
          </button>

          <button
            onClick={() => setActiveCategory('master')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeCategory === 'master'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Master Governance (3)
          </button>

          <button
            onClick={() => setActiveCategory('cycles')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeCategory === 'cycles'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cycles & Sandboxes (5)
          </button>

          <button
            onClick={() => setActiveCategory('forms')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeCategory === 'forms'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Forms & Workflow (6)
          </button>

          <button
            onClick={() => setActiveCategory('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              activeCategory === 'system'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            System, Users & Security (4)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search table or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Granular Entity Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntities.map((entity) => {
          const IconComp = entity.icon;
          const count = dbStatus ? dbStatus[entity.countKey] ?? 0 : 0;
          const isPopulated = count > 0;

          return (
            <Card
              key={entity.key}
              className={`border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                isPopulated ? 'border-slate-200/90 bg-white' : 'border-dashed border-slate-300 bg-slate-50/60'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                        isPopulated ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 leading-tight">
                        {entity.name}
                      </CardTitle>
                      <span className="font-mono text-[10px] text-slate-500 block">{entity.tableName}</span>
                    </div>
                  </div>

                  <Badge
                    variant={isPopulated ? 'nbp' : 'secondary'}
                    className="font-mono font-bold text-xs"
                  >
                    {loading ? '...' : `${count} ${count === 1 ? 'row' : 'rows'}`}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {entity.description}
                </CardDescription>
                {entity.dependentNote && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mt-2">
                    ⚠️ {entity.dependentNote}
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0 border-t border-slate-100 mt-2 pt-3 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold">
                  {isPopulated ? (
                    <span className="text-emerald-700 flex items-center">
                      <Check className="h-3 w-3 mr-1" /> Active
                    </span>
                  ) : (
                    <span className="text-slate-400">Empty Table</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {entity.cleanable && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading || count === 0}
                      onClick={() => setEntityToClean(entity)}
                      className="h-8 text-[11px] font-bold text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clean
                    </Button>
                  )}

                  {entity.seedable && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleSeedEntity(entity)}
                      className="h-8 text-[11px] font-bold bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                    >
                      <Sparkles className="h-3 w-3 mr-1 text-emerald-700" />
                      Seed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* MODAL: SINGLE ENTITY CLEAN CONFIRMATION */}
      {entityToClean && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-rose-300" />
                <span>Confirm Purge: {entityToClean.name}</span>
              </h3>
              <button onClick={() => setEntityToClean(null)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                You are about to delete all records from table <strong className="font-mono text-rose-700">{entityToClean.tableName}</strong>.
              </p>
              {entityToClean.dependentNote && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>Notice on cascade:</strong> {entityToClean.dependentNote}
                </div>
              )}
              <p className="text-[11px] text-slate-500">
                You can re-seed standard default data at any time using the "Seed" button.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setEntityToClean(null)} className="text-xs font-bold">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCleanEntity(entityToClean)}
                disabled={actionLoading}
                className="text-xs font-black bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Purge ({dbStatus ? dbStatus[entityToClean.countKey] ?? 0 : 0} rows)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FULL DATABASE PURGE CONFIRMATION */}
      {showFullPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-rose-950 to-rose-900 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <span>CRITICAL: Full Database Wipe / Purge</span>
              </h3>
              <button onClick={() => setShowFullPurgeModal(false)} className="text-white hover:bg-white/20 p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-800 leading-relaxed font-bold">
                This operation will completely clear all database tables (Master Employees, Reporting Groups, ESG Grades, Appraisal Cycles, Scores, Form Submissions, User Accounts, and Audit Events).
              </p>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                To confirm this destructive action, type <strong className="font-mono text-rose-700 font-black">PURGE-DATABASE</strong> below:
              </div>
              <Input
                placeholder="Type PURGE-DATABASE to confirm"
                value={purgeConfirmationText}
                onChange={(e) => setPurgeConfirmationText(e.target.value)}
                className="font-mono text-xs border-rose-300 focus:ring-rose-500"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowFullPurgeModal(false)} className="text-xs font-bold">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading || purgeConfirmationText !== 'PURGE-DATABASE'}
                onClick={handleFullPurge}
                className="text-xs font-black bg-rose-700 hover:bg-rose-800 text-white"
              >
                Execute Full Database Purge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
