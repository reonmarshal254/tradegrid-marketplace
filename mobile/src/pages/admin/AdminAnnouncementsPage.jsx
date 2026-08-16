import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import AdminLayout from '../../components/AdminLayout';
import { Spinner, EmptyState } from '../../components/Ui';
import { PlusIcon, TrashIcon, CheckCircleIcon, CloseIcon } from '../../components/Icons';
import { timeAgo } from '../../utils/format';

// Available platform pages for announcements
const PLATFORM_PAGES = [
  { value: '', label: 'No link' },
  { value: '/items', label: 'Browse Items' },
  { value: '/categories', label: 'Categories' },
  { value: '/pricing', label: 'Pricing Plans' },
  { value: '/advertise', label: 'Create Advertisement' },
  { value: '/post', label: 'Post Item' },
  { value: '/chat', label: 'Messages' },
  { value: '/seller-dashboard', label: 'Seller Dashboard' },
  { value: '/my-profile', label: 'My Profile' },
  { value: '/analytics', label: 'Analytics' },
  { value: '/about', label: 'About Us' },
  { value: '/contact', label: 'Contact Us' },
  { value: '/help', label: 'Help Center' },
  { value: '/buying-guide', label: 'Buying Guide' },
  { value: '/safety-guidelines', label: 'Safety Guidelines' },
];

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    message: '',
    link_text: '',
    link_url: '',
    is_enabled: true,
    position: 0
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const data = await api.announcements.listAll();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      title: '',
      message: '',
      link_text: '',
      link_url: '',
      is_enabled: true,
      position: 0
    });
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  function handleEdit(announcement) {
    setForm({
      title: announcement.title,
      message: announcement.message,
      link_text: announcement.link_text || '',
      link_url: announcement.link_url || '',
      is_enabled: announcement.is_enabled,
      position: announcement.position
    });
    setEditingId(announcement.id);
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.announcements.update(editingId, form);
      } else {
        await api.announcements.create(form);
      }
      await loadAnnouncements();
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id) {
    try {
      await api.announcements.toggle(id);
      await loadAnnouncements();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.announcements.delete(id);
      await loadAnnouncements();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            {showForm ? <CloseIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Announcement' : 'Create Announcement'}
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Feature your business here!"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="e.g., Advertise your business on our platform and reach thousands of buyers."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  maxLength={300}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Button Text (optional)
                  </label>
                  <input
                    value={form.link_text}
                    onChange={(e) => setForm({ ...form, link_text: e.target.value })}
                    placeholder="e.g., Learn more"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Link to Page (optional)
                  </label>
                  <select
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PLATFORM_PAGES.map((page) => (
                      <option key={page.value} value={page.value}>
                        {page.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    {form.link_text ? `Button will link to: ${form.link_url || 'No link'}` : 'No button will be shown'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Position (lower = first)
                  </label>
                  <input
                    type="number"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_enabled}
                      onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Enabled</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : announcements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            message="Create your first announcement to display on the homepage hero section."
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white rounded-xl border-2 p-6 transition ${
                  announcement.is_enabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                      {announcement.is_enabled ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <CheckCircleIcon className="w-3 h-3" /> Enabled
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Position: {announcement.position}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{announcement.message}</p>
                    {announcement.link_text && announcement.link_url && (
                      <div className="flex items-center gap-2 text-xs text-indigo-600 mt-2">
                        <span>Button: "{announcement.link_text}" → {PLATFORM_PAGES.find(p => p.value === announcement.link_url)?.label || announcement.link_url}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>Created by: {announcement.created_by_name}</span>
                      <span>{timeAgo(announcement.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(announcement.id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                        announcement.is_enabled
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                    >
                      {announcement.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
