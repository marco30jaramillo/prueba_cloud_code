'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { rolesConfigAPI } from '@/lib/api';
import styles from './page.module.scss';

// ──────────────────────────────────────────────────────────
// Types + helpers
// ──────────────────────────────────────────────────────────
type Level = 'none' | 'read' | 'write' | 'full';

const CARD_LEVEL_CLASS: Record<Level, string> = {
  none:  '',
  read:  'moduleCardRead',
  write: 'moduleCardWrite',
  full:  'moduleCardFull',
};

const BTN_ACTIVE_CLASS: Record<Level, string> = {
  none:  'levelBtnNoneActive',
  read:  'levelBtnReadActive',
  write: 'levelBtnWriteActive',
  full:  'levelBtnFullActive',
};

interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  permRead: string[];
  permWrite: string[];
  permFull: string[];
}

interface ModuleAccess { id: string; level: string; }

interface RoleData {
  id: string;
  name: string;
  description: string;
  moduleAccess: ModuleAccess[];
  directPermissions: string[];
  orphanPermissions: string[];
  effectivePermissions: string[];
}

interface ConfigData {
  modules: ModuleDef[];
  roles: RoleData[];
  allModulePerms: string[];
}

const LEVEL_LABELS: Record<Level, string> = {
  none:  'Sin acceso',
  read:  'Lectura',
  write: 'Escritura',
  full:  'Completo',
};

const LEVELS: Level[] = ['none', 'read', 'write', 'full'];

// ──────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────
export default function RolesPage() {
  return (
    <ProtectedRoute>
      <RolesContent />
    </ProtectedRoute>
  );
}

// ── Create Role Modal ─────────────────────────────────────
interface CreateModalProps {
  modules: ModuleDef[];
  onClose: () => void;
  onCreated: (role: RoleData) => void;
}

function CreateRoleModal({ modules, onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const getLevel = (moduleId: string): Level =>
    (moduleAccess.find(a => a.id === moduleId)?.level as Level) || 'none';

  const setLevel = (moduleId: string, level: Level) => {
    setModuleAccess(prev => {
      const rest = prev.filter(a => a.id !== moduleId);
      if (level === 'none') return rest;
      return [...rest, { id: moduleId, level }];
    });
  };

  const submit = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await rolesConfigAPI.create({ name: name.trim(), description: description.trim(), moduleAccess });
      onCreated(res.role);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al crear el rol');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Crear nuevo rol</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {error && <div className={`${styles.alert} ${styles.alertError}`} style={{ margin: '0 0 1rem' }}>{error}</div>}

        <div className={styles.formField}>
          <label className={styles.formLabel}>Nombre del rol *</label>
          <input
            className={styles.formInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ej. supervisor"
            autoFocus
          />
          <span className={styles.formHint}>Se guardará en minúsculas con guión bajo. Ejemplo: "supervisor_ventas"</span>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Descripción</label>
          <input
            className={styles.formInput}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="ej. Supervisor con acceso limitado"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Acceso a módulos</label>
          <div className={styles.modalModules}>
            {modules.map(mod => {
              const level = getLevel(mod.id);
              return (
                <div key={mod.id} className={styles.modalModuleRow}>
                  <span className={styles.modalModuleIcon}>{mod.icon}</span>
                  <span className={styles.modalModuleName}>{mod.name}</span>
                  <div className={styles.modalLevelBtns}>
                    {LEVELS.map(lvl => (
                      <button
                        key={lvl}
                        className={`${styles.levelBtn} ${level === lvl ? styles[BTN_ACTIVE_CLASS[lvl]] : ''}`}
                        onClick={() => setLevel(mod.id, lvl)}
                        type="button"
                      >
                        {LEVEL_LABELS[lvl]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.discardBtn} onClick={onClose} disabled={saving}>Cancelar</button>
          <button className={styles.saveBtn} onClick={submit} disabled={saving}>
            {saving ? 'Creando…' : 'Crear rol'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main content ──────────────────────────────────────────
function RolesContent() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'modules' | 'permissions' | 'effective'>('modules');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [pendingAccess, setPendingAccess] = useState<ModuleAccess[]>([]);
  const [pendingDirect, setPendingDirect] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async (selectId?: string) => {
    try {
      setLoading(true);
      const res = await rolesConfigAPI.get();
      setConfig(res);
      const targetId = selectId || selectedRoleId || res.roles?.[0]?.id;
      const target = res.roles?.find((r: RoleData) => r.id === targetId) || res.roles?.[0];
      if (target) {
        setSelectedRoleId(target.id);
        setPendingAccess(target.moduleAccess);
        setPendingDirect(target.directPermissions);
      }
    } catch {
      setError('No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => { load(); }, []);

  const selectRole = (role: RoleData) => {
    if (dirty && !confirm('¿Descartar cambios no guardados?')) return;
    setSelectedRoleId(role.id);
    setPendingAccess(role.moduleAccess);
    setPendingDirect(role.directPermissions);
    setDirty(false);
    setError('');
    setSuccessMsg('');
  };

  const selectedRole = config?.roles.find(r => r.id === selectedRoleId);
  const isSuperuser = selectedRole?.name === 'superuser';

  const getLevel = (moduleId: string): Level =>
    (pendingAccess.find(a => a.id === moduleId)?.level as Level) || 'none';

  const setLevel = (moduleId: string, level: Level) => {
    if (isSuperuser) return;
    setPendingAccess(prev => {
      const rest = prev.filter(a => a.id !== moduleId);
      if (level === 'none') return rest;
      return [...rest, { id: moduleId, level }];
    });
    setDirty(true);
  };

  const toggleDirectPerm = (perm: string) => {
    if (isSuperuser) return;
    setPendingDirect(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
    setDirty(true);
  };

  const save = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await rolesConfigAPI.updateRole(selectedRole.id, {
        moduleAccess:      pendingAccess,
        directPermissions: pendingDirect,
      });
      setSuccessMsg('Cambios guardados correctamente');
      setDirty(false);
      await load(selectedRole.id);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!selectedRole) return;
    setPendingAccess(selectedRole.moduleAccess);
    setPendingDirect(selectedRole.directPermissions);
    setDirty(false);
  };

  const handleRoleCreated = async (newRole: RoleData) => {
    setShowCreateModal(false);
    await load(newRole.id);
    setSuccessMsg(`Rol "${newRole.name}" creado. Ya está disponible para asignar a usuarios.`);
  };

  const orphanPerms = pendingDirect.filter(p =>
    p !== 'system:full-access' && !config?.allModulePerms.includes(p)
  );
  const effectivePerms = selectedRole?.effectivePermissions ?? [];

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Cargando configuración…</span>
      </div>
    );
  }

  if (!config) {
    return <div className={styles.errorMsg}>{error || 'No se pudo cargar la configuración'}</div>;
  }

  return (
    <div className={styles.page}>
      {showCreateModal && config && (
        <CreateRoleModal
          modules={config.modules}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleRoleCreated}
        />
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🛡️ Roles y Permisos</h1>
          <p className={styles.subtitle}>Gestiona el acceso de cada rol a módulos y permisos del sistema</p>
        </div>
      </div>

      <div className={styles.layout}>
        {/* ── Role list ── */}
        <aside className={styles.sidebar}>
          <button
            className={styles.createRoleBtn}
            onClick={() => setShowCreateModal(true)}
          >
            ＋ Crear nuevo rol
          </button>

          <div className={styles.sidebarLabel}>Roles</div>
          {config.roles.map(role => (
            <button
              key={role.id}
              className={`${styles.roleBtn} ${role.id === selectedRoleId ? styles.roleBtnActive : ''}`}
              onClick={() => selectRole(role)}
            >
              <span className={styles.roleName}>{role.name}</span>
              <span className={styles.roleDesc}>{role.description}</span>
              {role.name === 'superuser' && (
                <span className={styles.superBadge}>SUPER</span>
              )}
            </button>
          ))}
        </aside>

        {/* ── Role detail ── */}
        {selectedRole && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailTitle}>{selectedRole.name}</h2>
                <p className={styles.detailDesc}>{selectedRole.description}</p>
              </div>
              {dirty && (
                <div className={styles.actionRow}>
                  <button className={styles.discardBtn} onClick={discard} disabled={saving}>Descartar</button>
                  <button className={styles.saveBtn} onClick={save} disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </div>

            {error      && <div className={`${styles.alert} ${styles.alertError}`}>{error}</div>}
            {successMsg && <div className={`${styles.alert} ${styles.alertSuccess}`}>{successMsg}</div>}
            {isSuperuser && (
              <div className={`${styles.alert} ${styles.alertInfo}`}>
                El superusuario tiene acceso completo a todo. Su configuración no puede modificarse.
              </div>
            )}

            {/* Tabs */}
            <div className={styles.tabs}>
              {(['modules', 'permissions', 'effective'] as const).map(tab => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'modules'     && '📦 Acceso a módulos'}
                  {tab === 'permissions' && '🔑 Permisos directos'}
                  {tab === 'effective'   && '✅ Efectivos'}
                </button>
              ))}
            </div>

            {/* ── Tab: Module access ── */}
            {activeTab === 'modules' && (
              <div className={styles.moduleGrid}>
                {config.modules.map(mod => {
                  const level = getLevel(mod.id);
                  return (
                    <div key={mod.id} className={`${styles.moduleCard} ${styles[CARD_LEVEL_CLASS[level]] || ''}`}>
                      <div className={styles.moduleTop}>
                        <span className={styles.moduleIcon}>{mod.icon}</span>
                        <div>
                          <div className={styles.moduleName}>{mod.name}</div>
                          <div className={styles.moduleDescText}>{mod.description}</div>
                        </div>
                      </div>

                      <div className={styles.levelBtns}>
                        {LEVELS.map(lvl => (
                          <button
                            key={lvl}
                            className={`${styles.levelBtn} ${level === lvl ? styles[BTN_ACTIVE_CLASS[lvl]] : ''}`}
                            onClick={() => setLevel(mod.id, lvl)}
                            disabled={isSuperuser}
                            title={LEVEL_LABELS[lvl]}
                          >
                            {LEVEL_LABELS[lvl]}
                          </button>
                        ))}
                      </div>

                      <div className={styles.permPreview}>
                        {level === 'none' && <span className={styles.noAccess}>Sin permisos de este módulo</span>}
                        {level === 'read'  && mod.permRead.map(p => <span key={p} className={`${styles.permChip} ${styles.chipRead}`}>{p}</span>)}
                        {level === 'write' && [...new Set([...mod.permRead, ...mod.permWrite])].map(p => <span key={p} className={`${styles.permChip} ${styles.chipWrite}`}>{p}</span>)}
                        {level === 'full'  && [...new Set([...mod.permRead, ...mod.permWrite, ...mod.permFull])].map(p => <span key={p} className={`${styles.permChip} ${styles.chipFull}`}>{p}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Tab: Direct permissions ── */}
            {activeTab === 'permissions' && (
              <div className={styles.permSection}>
                <div className={styles.permSectionInfo}>
                  Permisos concedidos directamente a este rol, independientemente de los módulos.
                  Los marcados con <span className={styles.orphanTag}>huérfano</span> no pertenecen a ningún módulo.
                </div>

                {isSuperuser ? (
                  <div className={styles.permGrid}>
                    <span className={`${styles.permChip} ${styles.chipFull}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                      system:full-access
                    </span>
                  </div>
                ) : (
                  <div className={styles.permGroups}>
                    {config.modules.map(mod => {
                      const allModPerms = [...new Set([...mod.permRead, ...mod.permWrite, ...mod.permFull])];
                      if (!allModPerms.length) return null;
                      return (
                        <div key={mod.id} className={styles.permGroup}>
                          <div className={styles.permGroupLabel}>{mod.icon} {mod.name}</div>
                          <div className={styles.permGrid}>
                            {allModPerms.map(perm => (
                              <label key={perm} className={`${styles.permCheck} ${pendingDirect.includes(perm) ? styles.permCheckOn : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={pendingDirect.includes(perm)}
                                  onChange={() => toggleDirectPerm(perm)}
                                />
                                <span className={styles.permLabel}>{perm}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {orphanPerms.length > 0 && (
                      <div className={styles.permGroup}>
                        <div className={styles.permGroupLabel}>🔓 Permisos huérfanos (sin módulo)</div>
                        <div className={styles.permGrid}>
                          {orphanPerms.map(perm => (
                            <label key={perm} className={`${styles.permCheck} ${styles.permCheckOn} ${styles.orphanCheck}`}>
                              <input type="checkbox" checked onChange={() => toggleDirectPerm(perm)} />
                              <span className={styles.permLabel}>{perm}</span>
                              <span className={styles.orphanTag}>huérfano</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Effective permissions ── */}
            {activeTab === 'effective' && (
              <div className={styles.effectiveSection}>
                <p className={styles.effectiveInfo}>
                  Todos los permisos activos para este rol: propios + heredados de módulos asignados.
                </p>
                {isSuperuser ? (
                  <span className={`${styles.permChip} ${styles.chipFull}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                    system:full-access (acceso total)
                  </span>
                ) : (
                  <div className={styles.effectiveGrid}>
                    {effectivePerms.sort().map(perm => (
                      <span
                        key={perm}
                        className={`${styles.permChip} ${config.allModulePerms.includes(perm) ? styles.chipWrite : styles.chipOrphan}`}
                        title={config.allModulePerms.includes(perm) ? 'Heredado de módulo' : 'Permiso directo'}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.legend}>
                  <span className={`${styles.permChip} ${styles.chipWrite}`}>heredado de módulo</span>
                  <span className={`${styles.permChip} ${styles.chipOrphan}`}>permiso directo</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
