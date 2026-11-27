/**
 * İlan detayındaki "Teknik Özellikler" bölümü için saf yardımcılar.
 * Boş değerleri, iç/sistem alanlarını ve Türkçe etiketi olmayan anahtarları eler.
 */

export interface VisibleSpec {
  label: string;
  value: string;
}

/** Hiçbir zaman gösterilmeyen fiyatlandırma / yapılandırma anahtarları. */
export const HIDDEN_SPEC_KEYS: ReadonlySet<string> = new Set([
  'pricing_type',
  'unit_price_rate',
  'unit_price_unit',
  'service_area_type',
  'service_city_ids',
]);

/** Türkçe etiketi tanımlı anahtarlar. Burada olmayan anahtar gösterilmez. */
export const SPEC_LABELS_TR: Readonly<Record<string, string>> = {
  axle_count: 'Aks sayısı',
  boom_length: 'Bom uzunluğu',
  brand: 'Marka',
  brand_model: 'Marka / model',
  capacity: 'Kapasite',
  condition: 'Durum',
  construction_service_branch: 'Hizmet dalı',
  crew_size_people: 'Ekip (kişi)',
  delivery_installation_available: 'Teslimat ve montaj hizmeti',
  density: 'Yoğunluk',
  diameter: 'Çap',
  dimensions: 'Ölçüler',
  dimensions_spec: 'Ölçü / boyut',
  equipment_type: 'Ekipman tipi',
  fuel: 'Yakıt',
  haulage_capacity: 'Taşıma kapasitesi',
  has_license_document: 'Yetki belgesi',
  has_official_authorization: 'Resmi yetki',
  has_periodic_inspection: 'Periyodik muayene',
  has_tse_standard: 'TSE standardı',
  installation_included: 'Montaj dahil',
  is_explosion_proof: 'Ex-proof',
  lift_operator_included: 'Operatör dahil',
  lift_system_type: 'Sistem tipi',
  lifting_capacity_kg: 'Kaldırma kapasitesi (kg)',
  load_capacity_kg_m2: 'Yük kapasitesi (kg/m²)',
  mast: 'Direk',
  material_unit: 'Birim',
  min_order_quantity: 'En az sipariş miktarı',
  max_working_height_m: 'Maksimum çalışma yüksekliği (m)',
  model: 'Model',
  origin: 'Menşei',
  packaging: 'Ambalaj',
  power: 'Güç',
  power_output_kva: 'Güç (kVA)',
  quality_standard: 'Kalite belgesi',
  scaffold_system_type: 'İskele sistemi',
  scaffold_transport_included: 'Nakliye dahil',
  service_radius_km: 'Hizmet yarıçapı',
  slump: 'Slump',
  soundproof: 'Ses yalıtımlı',
  standard: 'Standart',
  strength: 'Dayanım sınıfı',
  surface_area_m2: 'Alan (m²)',
  team_experience_years: 'Ekip tecrübesi (yıl)',
  thickness: 'Kalınlık',
  tonnage: 'Tonaj',
  vehicle_type: 'Araç / kasa tipi',
  weight: 'Ağırlık',
  working_height_m: 'Çalışma yüksekliği (m)',
  working_hours: 'Çalışma saati',
  year: 'Model yılı',
};

/** İlan formundaki bilinen metin değerlerinin Türkçe karşılıkları. */
const KNOWN_VALUES_TR: Readonly<Record<string, string>> = {
  'sıfır': 'Sıfır',
  sifir: 'Sıfır',
};

const EMPTY_MARKERS = new Set(['', '-', '—']);

function formatValue(key: string, val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val === true) return 'Var';
  if (val === false) return 'Yok';
  if (Array.isArray(val)) {
    const joined = val.filter(v => v !== null && v !== undefined && typeof v !== 'object').map(v => String(v).trim()).filter(t => !EMPTY_MARKERS.has(t)).join(', ');
    return joined === '' ? null : joined;
  }
  if (typeof val === 'object') return null;
  const text = String(val).trim();
  if (EMPTY_MARKERS.has(text)) return null;
  if (key === 'service_radius_km') return `${text} km`;
  if (typeof val === 'string') {
    const known = KNOWN_VALUES_TR[text.toLocaleLowerCase('tr')];
    if (known) return known;
    if (text.includes('_')) {
      const spaced = text.replace(/_/g, ' ').trim();
      return spaced.charAt(0).toLocaleUpperCase('tr') + spaced.slice(1);
    }
  }
  return text;
}

export function visibleSpecs(specs: Record<string, unknown> | null | undefined): VisibleSpec[] {
  if (!specs || typeof specs !== 'object') return [];
  const result: VisibleSpec[] = [];
  for (const [key, val] of Object.entries(specs)) {
    if (HIDDEN_SPEC_KEYS.has(key)) continue;
    const label = SPEC_LABELS_TR[key];
    if (!label) continue;
    const value = formatValue(key, val);
    if (value === null) continue;
    result.push({ label, value });
  }
  return result;
}
