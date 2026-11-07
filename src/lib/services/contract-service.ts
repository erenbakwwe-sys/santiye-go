import { createClient } from '../supabase/client';
import {
  Contract,
  ContractSnapshot,
  ContractTemplate,
  ContractType,
  ContractStatus,
} from '../../types/database';
import { generateContractPdf } from './pdf-service';
import { logAdminAction } from './admin-service';

// -----------------------------------------------------------------------------
// DEMO / IN-MEMORY VERİ DEPOSU (Çevrimdışı ve Test Ortamı Güvencesi)
// -----------------------------------------------------------------------------
export let DEMO_CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'tmpl-rental-v1',
    template_type: 'rental',
    version: 1,
    title: 'İş Makineleri ve Ekipman Kiralama Sözleşmesi',
    standard_terms: `1. TARAFLAR: İşbu sözleşme ŞantiyeGO platformu üzerinden anlaşan Kiralayan ile Kiracı arasında akdedilmiştir.
2. KONU: İlanda ve sipariş dökümünde dinamik özellikleri belirtilen ekipmanın kiralanmasıdır.
3. ARACI ROLÜ: ŞantiyeGO Aracı Hizmet Sağlayıcıdır; sözleşmenin tarafı veya kefili değildir.
4. TESLİM VE İADE: Ekipman eksiksiz ve çalışır vaziyette tutanakla teslim edilir.
5. BAKIM VE KULLANIM: Kiracı ekipmanı iş güvenliği mevzuatına uygun kullanacaktır.
6. İPTAL ŞARTLARI: ŞantiyeGO İptal ve İade Koşulları geçerlidir.
7. UYUŞMAZLIKLAR: Yetkili mahkeme alanı hukukçular ve taraflarca bilahare belirlenecektir.
NOT: İşbu metin TASLAK niteliğinde olup hukuki incelemeden geçirilmelidir.`,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-service-v1',
    template_type: 'service',
    version: 1,
    title: 'Ağır Nakliye ve İnşaat Hizmeti Sözleşmesi',
    standard_terms: `1. TARAFLAR: İşbu sözleşme Hizmet Veren ile Hizmet Alan arasında akdedilmiştir.
2. KONU: Belirtilen şantiye güzergahında nakliye ve mühendislik hizmetinin ifasıdır.
3. ARACI ROLÜ: ŞantiyeGO Aracı Hizmet Sağlayıcıdır; hizmetin doğrudan ifacısı değildir.
4. YÜK SORUMLULUĞU: Hizmet alan doğru yük ve saha bilgisi vermekle yükümlüdür.
5. İPTAL: ŞantiyeGO hizmet iptal politikası geçerlidir.
NOT: İşbu metin TASLAK niteliğinde olup hukuki incelemeden geçirilmelidir.`,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export let DEMO_CONTRACTS: Contract[] = [
  {
    id: 'cnt-demo-001',
    contract_number: 'SNT-2026-KRL-1001',
    contract_type: 'rental',
    booking_id: 'b0000000-0000-0000-0000-000000000001',
    quote_id: null,
    company_id: 'f0000000-0000-0000-0000-000000000001',
    buyer_id: '6f3d3513-66cc-4180-a3af-bc6bcf3db658',
    template_id: 'tmpl-rental-v1',
    template_version: 1,
    data_snapshot: {
      contract_number: 'SNT-2026-KRL-1001',
      contract_type: 'rental',
      template_version: 1,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      company: {
        id: 'f0000000-0000-0000-0000-000000000001',
        name: 'Anadolu İş Makineleri Parkı',
        tax_office: 'Tuzla V.D.',
        tax_number: '1234567890',
        legal_type: 'LIMITED_COMPANY',
        address: 'İçmeler Mah. Sanayi Cad. No:14',
        city: 'İstanbul',
        district: 'Tuzla',
        authorized_person: 'Kemal Demir',
        phone: '+90 532 000 0101',
      },
      buyer: {
        id: '6f3d3513-66cc-4180-a3af-bc6bcf3db658',
        full_name: 'Ahmet Yılmaz',
        legal_type: 'individual',
        company_name: null,
        tax_office: null,
        tax_number: null,
        address: 'Barbaros Mah. Şantiye Sahası No:5, Ataşehir',
        phone: '+90 532 999 8877',
      },
      subject: {
        title: 'CAT 320D Paletli Ekskavatör (22 Ton)',
        category_name: 'İş Makineleri',
        start_date: '2026-11-15',
        end_date: '2026-11-25',
        worksite_address: 'Barbaros Mah. Konut Şantiyesi',
        city_name: 'İstanbul',
        district_name: 'Ataşehir',
        need_operator: true,
        need_fuel: false,
        need_transport: true,
      },
      pricing: {
        unit_price: 15000,
        total_price: 150000,
        currency: 'TRY',
        vat_included: true,
        payment_method: 'platform',
      },
      standard_terms: 'Standart sözleşme maddeleri dondurulmuştur.',
    },
    pdf_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'pending_approval',
    company_approved_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    buyer_approved_at: null,
    company_approved_ip: '127.0.0.1',
    buyer_approved_ip: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

// -----------------------------------------------------------------------------
// 1. ŞABLON YÖNETİMİ
// -----------------------------------------------------------------------------
export async function getContractTemplates(type?: ContractType): Promise<ContractTemplate[]> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      let query = supabase.from('contract_templates').select('*').eq('is_active', true).order('version', { ascending: false });
      if (type) {
        query = query.eq('template_type', type);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as ContractTemplate[];
      }
    }
  } catch {
    // fallback
  }

  if (type) {
    return DEMO_CONTRACT_TEMPLATES.filter((t) => t.template_type === type && t.is_active);
  }
  return DEMO_CONTRACT_TEMPLATES.filter((t) => t.is_active);
}

export async function createNewTemplateVersion(params: {
  templateType: ContractType;
  title: string;
  standardTerms: string;
  adminId: string;
}): Promise<{ success: boolean; template?: ContractTemplate; error?: string }> {
  const currentTemplates = await getContractTemplates(params.templateType);
  const highestVersion = currentTemplates.reduce((max, t) => Math.max(max, t.version), 0);
  const newVersion = highestVersion + 1;

  const newTemplate: ContractTemplate = {
    id: `tmpl-${params.templateType}-v${newVersion}-${Date.now()}`,
    template_type: params.templateType,
    version: newVersion,
    title: params.title,
    standard_terms: params.standardTerms,
    is_active: true,
    created_by: params.adminId,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase.from('contract_templates').insert(newTemplate).select().single();
      if (!error && data) {
        await logAdminAction(params.adminId, 'TEMPLATE_VERSION_CREATED', 'setting', data.id, {
          templateType: params.templateType,
          version: newVersion,
        });
        return { success: true, template: data as ContractTemplate };
      }
    }
  } catch {
    // fallback
  }

  DEMO_CONTRACT_TEMPLATES.unshift(newTemplate);
  await logAdminAction(params.adminId, 'TEMPLATE_VERSION_CREATED', 'setting', newTemplate.id, {
    templateType: params.templateType,
    version: newVersion,
  });

  return { success: true, template: newTemplate };
}

// -----------------------------------------------------------------------------
// 2. OTOMATİK SÖZLEŞME ÜRETİMİ VE DONDURMA (SNAPSHOT + SHA-256)
// -----------------------------------------------------------------------------
export async function createContract(params: {
  bookingId?: string | null;
  quoteId?: string | null;
  companyId: string;
  buyerId: string;
  contractType: ContractType;
  snapshot: ContractSnapshot;
}): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  const { bookingId, quoteId, companyId, buyerId, contractType, snapshot } = params;

  // Derin kopya ile veriyi dondur (Deep clone immutability)
  const frozenSnapshot: ContractSnapshot = JSON.parse(JSON.stringify(snapshot));

  // PDF üretimi ve SHA-256 özet hesaplama
  const pdfResult = await generateContractPdf(frozenSnapshot);

  const contractRecord: Contract = {
    id: `cnt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    contract_number: frozenSnapshot.contract_number,
    contract_type: contractType,
    booking_id: bookingId || null,
    quote_id: quoteId || null,
    company_id: companyId,
    buyer_id: buyerId,
    template_id: `tmpl-${contractType}-v${frozenSnapshot.template_version}`,
    template_version: frozenSnapshot.template_version,
    data_snapshot: frozenSnapshot,
    pdf_sha256: pdfResult.sha256,
    pdf_storage_path: `/contracts/${pdfResult.fileName}`,
    status: 'pending_approval',
    company_approved_at: null,
    buyer_approved_at: null,
    company_approved_ip: null,
    buyer_approved_ip: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase.from('contracts').insert(contractRecord).select().single();
      if (!error && data) {
        return { success: true, contract: data as Contract };
      }
    }
  } catch {
    // fallback
  }

  DEMO_CONTRACTS.unshift(contractRecord);
  return { success: true, contract: contractRecord };
}

// -----------------------------------------------------------------------------
// 3. SÖZLEŞME ERİŞİMİ VE LİSTELEME
// -----------------------------------------------------------------------------
export async function getContracts(
  userId: string,
  userRole: 'buyer' | 'company' | 'admin' | 'super_admin'
): Promise<Contract[]> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      let query = supabase.from('contracts').select('*').order('created_at', { ascending: false });

      if (userRole === 'buyer') {
        query = query.eq('buyer_id', userId);
      } else if (userRole === 'company') {
        // Kullanıcının şirket ID'sini bul
        const { data: comp } = await supabase.from('companies').select('id').eq('user_id', userId).maybeSingle();
        if (comp) {
          query = query.eq('company_id', comp.id);
        } else {
          query = query.eq('company_id', userId);
        }
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as Contract[];
      }
    }
  } catch {
    // fallback
  }

  // Demo fallback
  if (userRole === 'admin' || userRole === 'super_admin') {
    return DEMO_CONTRACTS;
  }
  if (userRole === 'buyer') {
    return DEMO_CONTRACTS.filter((c) => c.buyer_id === userId);
  }
  // company
  return DEMO_CONTRACTS.filter((c) => c.company_id === userId || c.data_snapshot?.company?.id === userId);
}

export async function getContractById(
  contractId: string,
  userId: string,
  userRole: 'buyer' | 'company' | 'admin' | 'super_admin'
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  let contract: Contract | undefined;

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase.from('contracts').select('*').eq('id', contractId).maybeSingle();
      if (!error && data) {
        contract = data as Contract;
      }
    }
  } catch {
    // fallback
  }

  if (!contract) {
    contract = DEMO_CONTRACTS.find((c) => c.id === contractId);
  }

  if (!contract) {
    return { success: false, error: 'Sözleşme bulunamadı.' };
  }

  // Yetki Denetimi: Yalnızca alıcı, firma veya admin görebilir
  const isBuyer = contract.buyer_id === userId;
  const isCompany = contract.company_id === userId || contract.data_snapshot?.company?.id === userId;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  if (!isBuyer && !isCompany && !isAdmin) {
    return { success: false, error: 'Bu sözleşmeyi görüntüleme yetkiniz bulunmamaktadır.' };
  }

  // Admin erişimleri loglanır
  if (isAdmin) {
    await logAdminAction(userId, 'CONTRACT_ACCESSED', 'compliance_log', contract.id, {
      contract_number: contract.contract_number,
      contract_type: contract.contract_type,
    });
  }

  return { success: true, contract };
}

// -----------------------------------------------------------------------------
// 4. İKİ TARAFLI ONAY VE REVİZYON AKIŞI
// -----------------------------------------------------------------------------
export async function approveContract(
  contractId: string,
  userId: string,
  userRole: 'buyer' | 'company',
  ipAddress = '127.0.0.1'
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  const fetchRes = await getContractById(contractId, userId, userRole);
  if (!fetchRes.success || !fetchRes.contract) {
    return { success: false, error: fetchRes.error || 'Sözleşme bulunamadı.' };
  }

  const contract = fetchRes.contract;
  const now = new Date().toISOString();

  if (userRole === 'buyer') {
    contract.buyer_approved_at = now;
    contract.buyer_approved_ip = ipAddress;
  } else {
    contract.company_approved_at = now;
    contract.company_approved_ip = ipAddress;
  }

  // İki taraf da onayladıysa durum "Karşılıklı Onaylandı" olur
  if (contract.buyer_approved_at && contract.company_approved_at) {
    contract.status = 'mutual_approved';
  } else {
    contract.status = 'pending_approval';
  }
  contract.updated_at = now;

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase
        .from('contracts')
        .update({
          buyer_approved_at: contract.buyer_approved_at,
          buyer_approved_ip: contract.buyer_approved_ip,
          company_approved_at: contract.company_approved_at,
          company_approved_ip: contract.company_approved_ip,
          status: contract.status,
          updated_at: contract.updated_at,
        })
        .eq('id', contractId);
    }
  } catch {
    // fallback
  }

  DEMO_CONTRACTS = DEMO_CONTRACTS.map((c) => (c.id === contractId ? contract : c));
  return { success: true, contract };
}

export async function requestContractRevision(
  contractId: string,
  userId: string,
  userRole: 'buyer' | 'company',
  revisionNotes: string
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  const fetchRes = await getContractById(contractId, userId, userRole);
  if (!fetchRes.success || !fetchRes.contract) {
    return { success: false, error: fetchRes.error || 'Sözleşme bulunamadı.' };
  }

  const contract = fetchRes.contract;
  const now = new Date().toISOString();

  // Onaylar sıfırlanır, durum revizyon talep edildi olur
  contract.status = 'revision_requested';
  contract.revision_notes = revisionNotes;
  contract.buyer_approved_at = null;
  contract.company_approved_at = null;
  contract.updated_at = now;

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase
        .from('contracts')
        .update({
          status: 'revision_requested',
          revision_notes: revisionNotes,
          buyer_approved_at: null,
          company_approved_at: null,
          updated_at: now,
        })
        .eq('id', contractId);
    }
  } catch {
    // fallback
  }

  DEMO_CONTRACTS = DEMO_CONTRACTS.map((c) => (c.id === contractId ? contract : c));
  return { success: true, contract };
}

export async function uploadSignedContract(
  contractId: string,
  userId: string,
  userRole: 'buyer' | 'company',
  signedCopyUrl: string
): Promise<{ success: boolean; contract?: Contract; error?: string }> {
  const fetchRes = await getContractById(contractId, userId, userRole);
  if (!fetchRes.success || !fetchRes.contract) {
    return { success: false, error: fetchRes.error || 'Sözleşme bulunamadı.' };
  }

  const contract = fetchRes.contract;
  const now = new Date().toISOString();

  contract.signed_copy_url = signedCopyUrl;
  contract.signed_uploaded_by = userId;
  contract.signed_uploaded_at = now;
  contract.status = 'mutual_approved'; // Islak imzalı yükleme ile onay tamamlanır
  contract.updated_at = now;

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase
        .from('contracts')
        .update({
          signed_copy_url: signedCopyUrl,
          signed_uploaded_by: userId,
          signed_uploaded_at: now,
          status: 'mutual_approved',
          updated_at: now,
        })
        .eq('id', contractId);
    }
  } catch {
    // fallback
  }

  DEMO_CONTRACTS = DEMO_CONTRACTS.map((c) => (c.id === contractId ? contract : c));
  return { success: true, contract };
}
