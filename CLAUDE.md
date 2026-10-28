# Stagorix — geliştirme talimatları

Stagorix: markadan bağımsız, çok ajanlı dikey video pipeline'ı (YouTube Shorts, Instagram Reels). Haberleri ve kullanıcının kendi videolarını markaya özel kısa videolara dönüştüren açık kaynak bir üretim hattıdır.

## Değişmez ilkeler

1. **Markadan bağımsız:** Çekirdek ortaktır; her marka/kişi/kurum, kurulum sihirbazı ve kullanıcı yönlendirmesiyle uyarlanır. Markaya özgü her şey (renk, yazı tipi, ses tonu, dil, kaynaklar, hareket dili, logo) `brands/<slug>/` profilinde durur. Hiçbir marka çekirdeğe gömülmez; çekirdek kodda marka adı, rengi veya metni sabit yazılmaz; bir markanın ayarı diğerini etkilemez. Random Talks Academy yalnızca ilk test markasıdır.
2. **Her cihazda:** macOS (Apple Silicon ve Intel), Windows (Docker Desktop + WSL2) ve Linux'ta aynı adımlarla kurulur ve aynı sonucu verir (altın testle doğrulanır). Varsayılan profil CPU'dur, GPU isteğe bağlıdır. Tek bir sisteme özgü özellik opsiyonel kalır ve üç sistem için de belgelenir.
3. **Kullanıcı kontrolünde:** Her adım, süre, maliyet ve onay noktası görünür (kontrol paneli hazır olana kadar sohbet ve plan dokümanında). Onay olmadan hiçbir şey yayınlanmaz. Hatalar sessizce yutulmaz; kaydı tutulur ve kullanıcıya gösterilir.

## Destek ilkeleri

4. **Güvenlik:** Token ve anahtarlar asla repoya ya da sohbete girmez; kullanıcı verisi yerelde kalır.
5. **Maliyet:** Varsayılan ücretsiz; ücretli servisler opsiyonel ve bütçe tavanlıdır.
6. **Lisans:** Sadece lisanslı varlık kullanılır; her varlığın kaynağı ve atfı kaydedilir.
7. **Bağımsızlık:** Tek bir LLM'e ya da servise kilitlenmez; sağlayıcılar değiştirilebilir.

## Dil

- Üretilen içeriğin dili her markanın profilinde belirlenir (TR, EN veya çok dilli); çekirdek hiçbir dile bağlı değildir.
- Kod, kimlikler, commit mesajları, repo dokümanları ve README İngilizce yazılır. Bu dosya proje sahibiyle çalışma talimatı olduğu için Türkçedir.

## Çalışma kuralları

- Serhat'la iletişim Türkçe, kısa ve net; gerektiğinde görsel/tablo.
- Aşama aşama ilerlenir; her adımda ne yapıldığı bildirilir, sonraki adım için Serhat'ın komutu beklenir. Komut olmadan yeni bir aşamaya geçilmez, kapsam kararı verilmez.
- Kararları Serhat verir; seçenekler gerekçesiyle sunulur. Commit/push ve geri alınamaz işler yalnızca onayla.
- Dürüst eleştiri verilir; varsayımlar açıkça belirtilir.
- Her şey repoya kaydedilir; geçici ortamda kalan kod kaybolabilir.

Her öneri ve kod kararı bu ilkelere göre kontrol edilir. Güncel plan: "Stagorix — Ana Plan v3" dokümanı.
