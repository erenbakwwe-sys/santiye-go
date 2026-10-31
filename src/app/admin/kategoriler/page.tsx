'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderTree,
  Plus,
  Edit,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowUpDown,
  X,
  Save,
  Sliders,
  Tag,
  Check,
} from 'lucide-react';
import { getAdminCategories, saveCategory } from '@/lib/services/admin-service';
import { getCategoryAttributes, addCategoryAttribute } from '@/lib/services/attribute-service';
import { Category, CategoryAttribute, AttributeType, ListingType } from '@/types/database';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [allowedTypes, setAllowedTypes] = useState<ListingType[]>(['rental', 'sale']);
  const [notice, setNotice] = useState('');

  // Dynamic Attributes Modal State
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [catAttributes, setCatAttributes] = useState<CategoryAttribute[]>([]);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrSlug, setNewAttrSlug] = useState('');
  const [newAttrType, setNewAttrType] = useState<AttributeType>('text');
  const [newAttrUnit, setNewAttrUnit] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');
  const [newAttrRequired, setNewAttrRequired] = useState(false);
  const [newAttrFilterable, setNewAttrFilterable] = useState(true);
  const [attrSaving, setAttrSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await getAdminCategories();
    setCategories([...data]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (cat?: Category) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatSlug(cat.slug);
      setOrderIndex(cat.order_index);
      setAllowedTypes(cat.allowed_listing_types || ['rental', 'sale']);
    } else {
      setEditingCat(null);
      setCatName('');
      setCatSlug('');
      setOrderIndex(categories.length + 1);
      setAllowedTypes(['rental', 'sale']);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const payload: Partial<Category> = {
      id: editingCat?.id,
      name: catName.trim(),
      slug: catSlug.trim() || catName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      order_index: Number(orderIndex),
      is_active: true,
      allowed_listing_types: allowedTypes,
      subcategories: editingCat?.subcategories || [],
    };

    await saveCategory(payload, 'admin-super-001');
    setModalOpen(false);
    setNotice('Kategori ve izin verilen ilan tipleri başarıyla kaydedildi!');
    loadData();
    setTimeout(() => setNotice(''), 3000);
  };

  const openAttributeModal = async (cat: Category) => {
    setActiveCategory(cat);
    const attrs = await getCategoryAttributes(cat.slug);
    setCatAttributes(attrs);
    setNewAttrName('');
    setNewAttrSlug('');
    setNewAttrType('text');
    setNewAttrUnit('');
    setNewAttrOptions('');
    setNewAttrRequired(false);
    setNewAttrFilterable(true);
    setAttrModalOpen(true);
  };

  const handleAddAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategory || !newAttrName.trim()) return;

    setAttrSaving(true);
    const slug = newAttrSlug.trim() || newAttrName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const options = newAttrOptions
      ? newAttrOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : undefined;

    const created = await addCategoryAttribute({
      category_id: activeCategory.id,
      name: newAttrName.trim(),
      slug,
      attribute_type: newAttrType,
      unit: newAttrUnit.trim() || undefined,
      options,
      is_required: newAttrRequired,
      is_filterable: newAttrFilterable,
      show_in_comparison: true,
      order_index: catAttributes.length + 1,
    });

    setCatAttributes((prev) => [...prev, created]);
    setNewAttrName('');
    setNewAttrSlug('');
    setNewAttrUnit('');
    setNewAttrOptions('');
    setAttrSaving(false);
    setNotice(`'${created.name}' dinamik özelliği eklendi!`);
    setTimeout(() => setNotice(''), 3000);
  };

  const toggleAllowedType = (type: ListingType) => {
    if (allowedTypes.includes(type)) {
      if (allowedTypes.length === 1) return; // En az bir tip seçili kalmalı
      setAllowedTypes(allowedTypes.filter((t) => t !== type));
    } else {
      setAllowedTypes([...allowedTypes, type]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-slate-500 hover:text-navy-900 font-bold">
              Yönetim Paneli
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-xs text-orange-600 font-bold">Kategori Yönetimi</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1">Kategori & Dinamik Özellik Yönetimi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            İskele, asansör, ekipman ve inşaat hizmetleri kategorilerini, ilan tiplerini ve dinamik teknik alanlarını yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          YENİ KATEGORİ EKLE
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                  Sıra: #{cat.order_index}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Aktif" />
              </div>

              <h3 className="font-extrabold text-navy-900 text-base mt-2">{cat.name}</h3>
              <div className="text-[11px] text-slate-400 font-mono">/{cat.slug}</div>

              {/* Allowed Listing Types Badges */}
              <div className="mt-2.5 flex flex-wrap gap-1">
                {(cat.allowed_listing_types || ['rental', 'sale']).map((t) => (
                  <span
                    key={t}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t === 'rental'
                        ? 'bg-navy-100 text-navy-900'
                        : t === 'service'
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {t === 'rental' ? 'Kiralık' : t === 'service' ? 'Hizmet' : 'Satılık'}
                  </span>
                ))}
              </div>

              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="mt-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Alt Kategoriler ({cat.subcategories.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                    {cat.subcategories.map((sub) => (
                      <span
                        key={sub.id}
                        className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openAttributeModal(cat)}
                className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Sliders className="w-3.5 h-3.5" />
                Özellikler
              </button>

              <button
                type="button"
                onClick={() => openModal(cat)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Edit className="w-3.5 h-3.5" />
                Düzenle
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-navy-900 text-base">
                {editingCat ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Adı *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Örn: İskele & Kalıp Sistemleri"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Kısa Adı (Slug)</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="Örn: iskele-kalip"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Desteklenen İlan Tipleri (Listing Types)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    onClick={() => toggleAllowedType('rental')}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition ${
                      allowedTypes.includes('rental')
                        ? 'border-navy-900 bg-navy-50 text-navy-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>Kiralık</span>
                    {allowedTypes.includes('rental') && <Check className="w-3.5 h-3.5 text-navy-900" />}
                  </label>
                  <label
                    onClick={() => toggleAllowedType('sale')}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition ${
                      allowedTypes.includes('sale')
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>Satılık</span>
                    {allowedTypes.includes('sale') && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                  </label>
                  <label
                    onClick={() => toggleAllowedType('service')}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition ${
                      allowedTypes.includes('service')
                        ? 'border-purple-700 bg-purple-50 text-purple-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>Hizmet</span>
                    {allowedTypes.includes('service') && <Check className="w-3.5 h-3.5 text-purple-700" />}
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sıralama Önceliği</label>
                <input
                  type="number"
                  min="1"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Attributes Modal */}
      {attrModalOpen && activeCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-navy-900 text-base">
                  Dinamik Özellikler: {activeCategory.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Bu kategorideki ilan formunda ve arama filtrelerinde gösterilen alanlar
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttrModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6">
              {/* Existing Attributes List */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                  Tanımlı Alanlar ({catAttributes.length})
                </h4>
                {catAttributes.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border text-center text-xs text-slate-500">
                    Henüz dinamik özellik tanımlanmamış.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden text-xs">
                    {catAttributes.map((attr) => (
                      <div key={attr.id} className="p-3 bg-white flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-navy-900 flex items-center gap-2">
                            <span>{attr.name}</span>
                            {attr.unit && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono">
                                {attr.unit}
                              </span>
                            )}
                            {attr.is_required && (
                              <span className="px-1 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-bold">
                                Zorunlu
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            slug: {attr.slug} • tip: {attr.attribute_type}
                            {attr.options ? ` • seçenekler: [${attr.options.join(', ')}]` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold shrink-0">
                          Aktif
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Attribute Form */}
              <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/30 space-y-3">
                <h4 className="text-xs font-black text-navy-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-orange-500" />
                  Yeni Dinamik Özellik / Alan Ekle
                </h4>

                <form onSubmit={handleAddAttribute} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Özellik Adı *</label>
                      <input
                        type="text"
                        required
                        value={newAttrName}
                        onChange={(e) => setNewAttrName(e.target.value)}
                        placeholder="Örn: Çalışma Yüksekliği"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Alan Anahtarı (Slug)</label>
                      <input
                        type="text"
                        value={newAttrSlug}
                        onChange={(e) => setNewAttrSlug(e.target.value)}
                        placeholder="Örn: working_height_m"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Veri Tipi</label>
                      <select
                        value={newAttrType}
                        onChange={(e) => setNewAttrType(e.target.value as AttributeType)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="text">Metin (Text)</option>
                        <option value="number">Sayısal (Number)</option>
                        <option value="boolean">Evet/Hayır (Boolean)</option>
                        <option value="select">Seçenek Listesi (Select)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Birim (Opsiyonel)</label>
                      <input
                        type="text"
                        value={newAttrUnit}
                        onChange={(e) => setNewAttrUnit(e.target.value)}
                        placeholder="Örn: m, m², kg, ton"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Seçenekler (Virgülle)</label>
                      <input
                        type="text"
                        disabled={newAttrType !== 'select'}
                        value={newAttrOptions}
                        onChange={(e) => setNewAttrOptions(e.target.value)}
                        placeholder="Örn: Teleskopik, Eklemli, Makaslı"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 disabled:bg-slate-100 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newAttrRequired}
                        onChange={(e) => setNewAttrRequired(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-orange-500"
                      />
                      <span>İlanda Doldurulması Zorunlu</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={newAttrFilterable}
                        onChange={(e) => setNewAttrFilterable(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-orange-500"
                      />
                      <span>Arama Filtrelerinde Göster</span>
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={attrSaving}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Özelliği Sisteme Ekle
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setAttrModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-navy-900 text-white font-bold text-xs hover:bg-navy-800"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
