Geçen hafta, bayram tatili vesilesiyle üniversitemden memleketime dönerken yaşadığım bir deneyim, bu "algoritmalardaki pürüzsüzlük ve kontrollerimizdeki kaos" meselesi üzerine uzun uzun tefekkür etmeme vesile oldu. Yıllardır havacılıkla yakından ilgilenen ve bir uçağın dinamiklerine az çok hakim olan biri olarak; seferin ortasında, uçağın gökyüzünde düz bir hat çizdiği o yüksek **Cruise (Seyir) İrtifasında** yolculuğumuza devam ediyorduk. Uçak otopilotta gayet düz, sarsıntıların çok nadir olduğu tabiri caizse bir yağ gibi akıyordu. Gelgelelim iniş için alçalmaya geçtiğimizde ve kontrolü bizzat pilot devraldığında, o yüksek irtifadaki pürüzsüzlükten eser kalmadı. Değişen hava akımları ve rüzgarla birlikte, kokpitten arkadaki yolcu koltuğuna yansıyan çok daha dinamik, sarsıcı ve dışarıdan bakıldığında adeta "kaotik" görünen bir kontrol süreci başlamıştı.

Bu süreç ve deneyim aklımda bir soru işareti oluşturdu. Acaba artık insan kontrolleri, kontrol algoritmalarına kıyasla daha mı kaotik? Ya da tersten düşündüğümüzde, algoritmalar bizden daha mı kusursuz?

## Önce algoritmaların ne olduğunu hatırlayalım:

Literatürde algoritma, belli bir problemi çözmek veya belirli bir amaca ulaşmak için tasarlanan yol demektir.[kaynak gelecek] Bu yollar sürecin başlangıcından sonuna kadar giden anlamlı adımlar halinde gösterilir. Günlük yaşantımızda bunu çay demlemenin süreç içerisindeki her bir adımına benzetebiliriz. Örneğin ocağın altını açmadan demliğe çayı koymanın bir anlamı olmadığı gibi, işlemi ocağı yak, su koy, su kaynayınca dem koy, demlenmesini bekle gibi sıralı adımlara bölmemiz gerekir.

Ufak bir genel kültür olsun, algoritmanın mucidi Türk-İslam alimlerinin matematik ve mühendislik alanlarına en önde gelenlerinden Harezmi'dir. Hatta algoritma kelimesi, alimin ismini tam telaffuz edemeyen Avrupalıların "El-Harezmi"yi zamanla "algorizm"e dönüştürmesinden gelir.

Günümüzde, sayısal elektronik sistemlerinin tümü algoritmalar temelinde gelişir. Bu yazımıza vesile olan uçuş kontrol algoritmaları, veya otomotiv sektöründe iyice yer ettiğinden yavaş yavaş hepimizin aşina olduğu şerit takip asistanı da buna örnektir. E adı geçmişken bunları da ufak bi anlatalım bari;

## Uçuş Kontrol Algoritması Nedir?

Aslında havacılık dünyasında yıllardır yolcu uçaklarında bizzat konforunu deneyimlediğimiz bu algoritmaların temeli tek bir amaca dayanıyor: Uçağı havada stabil tutarak pilotun üzerindeki fiziksel yükü azaltmak. İlk versiyonları 1910'lu yıllarda, uçağın jiroskopik verilerle düz uçmasını sağlamak amacıyla tasarlanan bu mekanik mantık, zamanla bilgisayarların ve yüksek teknoloji donanımların da devreye girmesiyle milyon parametreli birer dijital beyne dönüştü.

Artık havacılığın bir vazgeçilmezi haline gelen uçuş kontrol algoritmaları, günümüzde adını çokça duyduğumuz İHA ve SİHA'lardan hobi amaçlı uçurduğumuz drone'lara kadar otonom hava sistemlerinin ciddi manada kalbi olmuş durumda.

## Farklı bir pencereden de örnek verelim, Şerit Takip Asistanları:

Tıpkı gökyüzündeki otopilot gibi, bu sefer de direksiyon başında konforunu hissettiğimiz bu algoritmanın da amacı aynı: Yolculuğu sabitlemek ve sürücünün yükünü azaltıp hataları engellemek. İlk versiyonları sadece şeritten çıkarken direksiyonu titretip bizi uyaran basit birer asistan iken; zamanla gelişen sensörlerin ve akıllı sistemlerin entegre olmasıyla, yolu bizim yerimize okuyan birer sürüş beynine dönüştü, hatta günümüzde otomotiv sektörünün standart bir güvenlik kuralı haline geldi.

## Algoritmalar bizden daha mı kusursuz çalışıyor?

Şimdi konumuza geri dönecek olursak,