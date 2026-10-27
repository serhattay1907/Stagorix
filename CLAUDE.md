# Videus — geliştirme talimatları

Videus; haberleri ve kullanıcının kendi videolarını markaya özel kısa videolara (YouTube Shorts, Instagram Reels) dönüştüren, açık kaynak, çok ajanlı bir üretim hattıdır.

## Temel ilkeler (her kararda uyulur)

1. **Markadan bağımsız çekirdek.** Mimari tek bir kanal, kişi veya kurum için yazılmaz. Marka, kişi ya da kuruma özgü her şey (renk, yazı tipi, ses tonu, kaynaklar, hareket dili, logo) `brands/<slug>/` profilinde durur. Çekirdek kodda marka adı, rengi veya metni sabit yazılmaz. Yeni bir marka, kullanıcıyı adım adım yönlendiren bir kurulum akışıyla eklenir. Random Talks Academy yalnızca ilk test markasıdır.
2. **Her cihazda kurulum.** macOS (Apple Silicon ve Intel), Windows (WSL2 veya Docker Desktop) ve Linux üzerinde aynı komutlarla kurulur ve aynı çıktıyı üretir. Varsayılan profil CPU'dur; GPU isteğe bağlıdır. Platforma özel bir adım varsa, üç işletim sistemi için de belgelenir ve test edilir.
3. **Süreç kontrolü ve takibi.** Kullanıcı her çalıştırmanın hangi aşamada olduğunu, ne ürettiğini, ne kadar sürdüğünü ve ne kadar maliyet çıkardığını görebilmelidir. Yayınlama gibi geri alınamayan adımlar kullanıcı onayı olmadan yapılmaz. Hatalar sessizce yutulmaz; kaydı tutulur ve kullanıcıya gösterilir.

## Çalışma biçimi

- Proje sahibinin komutu olmadan yeni bir aşamaya geçilmez ve kapsam kararı verilmez. Her adımdan sonra durum bildirilir.
- Dokümantasyon ve kullanıcıya dönük metinler Türkçedir; kod, kimlikler ve commit mesajları İngilizce olabilir.
