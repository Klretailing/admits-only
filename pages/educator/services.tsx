import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import EducatorDashboardLayout from '../../components/EducatorDashboardLayout';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  type: string;
  maxStudents: number;
  active: boolean;
}

const SERVICE_TYPES = [
  { value: 'one_on_one', label: '1:1 Session' },
  { value: 'group', label: 'Group Session' },
  { value: 'package', label: 'Package Deal' },
];

export default function EducatorServices() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', duration: 60, price: 0, type: 'one_on_one', maxStudents: 1,
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'educator') router.push('/dashboard');
  }, [status, session, router]);

  const fetchServices = () => {
    fetch('/api/educator/services')
      .then(r => r.json())
      .then(d => { setServices(d.services || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'authenticated') fetchServices();
  }, [status]);

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm({ name: service.name, description: service.description, duration: service.duration, price: service.price, type: service.type, maxStudents: service.maxStudents });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingService(null);
    setForm({ name: '', description: '', duration: 60, price: 0, type: 'one_on_one', maxStudents: 1 });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editingService ? `/api/educator/services/${editingService.id}` : '/api/educator/services';
    const method = editingService ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowModal(false);
      fetchServices();
    }
    setSaving(false);
  };

  const handleToggleActive = async (service: Service) => {
    await fetch(`/api/educator/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !service.active }),
    });
    fetchServices();
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Delete this service? This cannot be undone.')) return;
    await fetch(`/api/educator/services/${serviceId}`, { method: 'DELETE' });
    fetchServices();
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-surface"><svg className="w-6 h-6 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;
  }

  return (
    <EducatorDashboardLayout>
      <Head><title>Services | AdmitsOnly Educator</title></Head>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-primary">Services</h1>
            <p className="mt-1 text-slate-500">Define the packages and sessions you offer</p>
          </div>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2 self-start">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Service
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading services...</div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 font-medium mb-1">No services yet</p>
            <p className="text-xs text-slate-400 mb-4">Create your first service package to start booking sessions.</p>
            <button onClick={openCreate} className="btn-primary text-sm">Create Your First Service</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map(service => (
              <div key={service.id} className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-md ${service.active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-primary">{service.name}</h3>
                      {!service.active && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-400">INACTIVE</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-50 text-purple-600">
                      {SERVICE_TYPES.find(t => t.value === service.type)?.label || service.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-display text-primary">${service.price}</p>
                    <p className="text-[10px] text-slate-400">{service.duration} min</p>
                  </div>
                </div>
                {service.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{service.description}</p>
                )}
                {service.type === 'group' && (
                  <p className="text-xs text-slate-400 mb-3">Max {service.maxStudents} students</p>
                )}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button onClick={() => openEdit(service)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">Edit</button>
                  <button onClick={() => handleToggleActive(service)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${service.active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                    {service.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(service.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold font-display text-primary mb-4">
              {editingService ? 'Edit Service' : 'Create New Service'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Service Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. SAT Prep Session"
                  required
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px] resize-y"
                  placeholder="Describe what this service includes..."
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-semibold text-primary">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, type: t.value, maxStudents: t.value === 'one_on_one' ? 1 : p.maxStudents }))}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        form.type === t.value ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Price ($)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    min={0}
                    step={5}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-semibold text-primary">Duration</label>
                  <select
                    value={form.duration}
                    onChange={e => setForm(p => ({ ...p, duration: parseInt(e.target.value) }))}
                    className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                {form.type === 'group' && (
                  <div>
                    <label className="block mb-1.5 text-sm font-semibold text-primary">Max Students</label>
                    <input
                      type="number"
                      value={form.maxStudents}
                      onChange={e => setForm(p => ({ ...p, maxStudents: parseInt(e.target.value) || 1 }))}
                      className="w-full border border-slate-200 bg-surface p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      min={2}
                      max={50}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary text-sm disabled:opacity-60">
                  {saving ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EducatorDashboardLayout>
  );
}
