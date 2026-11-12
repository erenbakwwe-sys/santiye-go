import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  markConversationAsRead,
} from '../src/lib/services/message-service';

async function runMessageTests() {
  console.log('=== MESAJLAŞMA VE İLETİŞİM TESTLERİ ===\n');

  // 1. Yeni kullanıcı için başlangıçta sahte konuşma olmamalı
  const emptyUserConvs = await getConversations('new-test-user-999');
  if (emptyUserConvs.length === 0) {
    console.log('✅ [PASS] Yeni kullanıcı için sahte/demo konuşma bulunmuyor (Sıfır sahte veri).');
  } else {
    console.error('❌ [FAIL] Beklenmedik konuşma bulundu:', emptyUserConvs);
    process.exit(1);
  }

  // 2. Yeni konuşma başlatma
  const startRes = await startConversation({
    buyerId: 'buyer-user-123',
    companyId: 'company-user-456',
    listingTitle: 'CAT 320 Ekskavatör',
    companyName: 'Demir Hafriyat',
    initialMessage: 'Merhaba, haftaya makine müsait midir?',
  });

  if (startRes.success && startRes.conversation) {
    console.log('✅ [PASS] Konuşma başarıyla başlatıldı ID:', startRes.conversation.id);
  } else {
    console.error('❌ [FAIL] Konuşma başlatılamadı:', startRes.error);
    process.exit(1);
  }

  const convId = startRes.conversation.id;

  // 3. Mesaj gönderme (İletişim numarası maskeleme testi)
  const sendRes = await sendMessage(
    convId,
    'buyer-user-123',
    'Beni 0532 999 88 77 numarasından arayabilir misiniz?'
  );

  if (sendRes.success && sendRes.message) {
    if (sendRes.isMasked && sendRes.message.body.toLowerCase().includes('[iletişim bilgisi gizlendi]')) {
      console.log('✅ [PASS] Telefon numarası başarıyla maskelendi ve güvenlik kuralı işletildi.');
    } else {
      console.error('❌ [FAIL] Telefon numarası maskelenmedi:', sendRes.message.body);
      process.exit(1);
    }
  } else {
    console.error('❌ [FAIL] Mesaj gönderilemedi:', sendRes.error);
    process.exit(1);
  }

  // 4. Mesajları listeleme
  const messages = await getMessages(convId);
  if (messages.length === 2) {
    console.log('✅ [PASS] Konuşmadaki 2 mesaj eksiksiz listelendi.');
  } else {
    console.error('❌ [FAIL] Beklenen 2 mesaj fakat gelen:', messages.length);
    process.exit(1);
  }

  // 5. Okundu işaretleme
  await markConversationAsRead(convId, 'company-user-456');
  console.log('✅ [PASS] Konuşma okundu olarak işaretlendi.');

  // 6. Alıcının konuşmaları
  const buyerConvs = await getConversations('buyer-user-123');
  if (buyerConvs.length === 1 && buyerConvs[0].id === convId) {
    console.log('✅ [PASS] Alıcının konuşmaları arasında yeni başlatılan konuşma listelendi.');
  } else {
    console.error('❌ [FAIL] Alıcı konuşması listelenemedi:', buyerConvs);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('TÜM MESAJLAŞMA TESTLERİ BAŞARIYLA GEÇTİ!');
  console.log('========================================\n');
}

runMessageTests().catch((e) => {
  console.error('Test hatası:', e);
  process.exit(1);
});
