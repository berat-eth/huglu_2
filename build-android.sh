#!/bin/bash

# Huğlu Outdoor Android APK Build Script
# Ubuntu 22.04 için yerel build scripti
# Normal kullanıcı veya root olarak çalıştırılabilir

set -e

echo "🚀 Huğlu Outdoor APK Build Başlatılıyor..."
echo "================================================"

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Root kontrolü
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}⚠️  Root olarak çalışıyorsunuz. Normal kullanıcı olarak çalıştırmanız önerilir.${NC}"
    echo -e "${YELLOW}⚠️  Devam etmek için 5 saniye bekleniyor...${NC}"
    sleep 5
fi

# Swap alanı oluştur
setup_swap() {
    echo -e "${YELLOW}💾 Swap alanı kontrol ediliyor...${NC}"
    
    # Mevcut swap'ı kontrol et
    SWAP_SIZE=$(free -m | grep Swap | awk '{print $2}')
    SWAP_FILE="/swapfile"
    
    if [ "$SWAP_SIZE" -lt 5120 ]; then
        echo -e "${YELLOW}📦 5GB swap alanı oluşturuluyor...${NC}"
        
        # Root kontrolü
        if [ "$EUID" -ne 0 ]; then
            echo -e "${RED}❌ Swap oluşturmak için root yetkisi gereklidir.${NC}"
            echo -e "${YELLOW}Lütfen script'i sudo ile çalıştırın veya manuel olarak swap oluşturun:${NC}"
            echo "sudo fallocate -l 5G $SWAP_FILE"
            echo "sudo chmod 600 $SWAP_FILE"
            echo "sudo mkswap $SWAP_FILE"
            echo "sudo swapon $SWAP_FILE"
            exit 1
        fi
        
        # Swap dosyası varsa kaldır
        if [ -f "$SWAP_FILE" ]; then
            echo -e "${YELLOW}Eski swap dosyası kaldırılıyor...${NC}"
            swapoff $SWAP_FILE 2>/dev/null || true
            rm -f $SWAP_FILE
        fi
        
        # 5GB swap dosyası oluştur
        fallocate -l 5G $SWAP_FILE
        chmod 600 $SWAP_FILE
        mkswap $SWAP_FILE
        swapon $SWAP_FILE
        
        echo -e "${GREEN}✓ 5GB swap alanı oluşturuldu ve etkinleştirildi${NC}"
        
        # Swap'ı kalıcı yap (opsiyonel)
        if ! grep -q "$SWAP_FILE" /etc/fstab; then
            echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
            echo -e "${GREEN}✓ Swap kalıcı olarak yapılandırıldı${NC}"
        fi
    else
        echo -e "${GREEN}✓ Swap alanı yeterli (${SWAP_SIZE}MB)${NC}"
    fi
    
    # Swap durumunu göster
    echo -e "${BLUE}📊 Mevcut bellek durumu:${NC}"
    free -h
}

# Gerekli araçları kontrol et
check_requirements() {
    echo -e "${YELLOW}📋 Gereksinimler kontrol ediliyor...${NC}"
    
    # Node.js kontrolü
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js bulunamadı. Lütfen Node.js yükleyin.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"
    
    # npm kontrolü
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm bulunamadı.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm: $(npm --version)${NC}"
    
    # Java kontrolü
    if ! command -v java &> /dev/null; then
        echo -e "${RED}❌ Java bulunamadı. Lütfen JDK 11 veya üzeri yükleyin.${NC}"
        echo "Kurulum: sudo apt install openjdk-11-jdk"
        exit 1
    fi
    echo -e "${GREEN}✓ Java: $(java -version 2>&1 | head -n 1)${NC}"
    
    # Android SDK kontrolü
    if [ -z "$ANDROID_HOME" ]; then
        echo -e "${RED}❌ ANDROID_HOME environment variable tanımlı değil.${NC}"
        echo "Android SDK kurulumu gerekli."
        exit 1
    fi
    echo -e "${GREEN}✓ Android SDK: $ANDROID_HOME${NC}"
}

# Bağımlılıkları yükle
install_dependencies() {
    echo -e "${YELLOW}📦 Bağımlılıklar yükleniyor...${NC}"
    
    # Node modules ve cache temizle
    echo -e "${YELLOW}🧹 Eski node_modules temizleniyor...${NC}"
    rm -rf node_modules
    rm -f package-lock.json
    rm -rf .expo
    
    # Bağımlılıkları yükle
    npm install --legacy-peer-deps
    echo -e "${GREEN}✓ Bağımlılıklar yüklendi${NC}"
    
    # Expo paketlerini uyumlu versiyonlara güncelle
    echo -e "${YELLOW}🔄 Expo paketleri uyumlu versiyonlara güncelleniyor...${NC}"
    npx expo install --fix || echo -e "${YELLOW}⚠️  expo install --fix atlandı (opsiyonel)${NC}"
}

# Expo prebuild
run_prebuild() {
    echo -e "${YELLOW}🔧 Expo prebuild çalıştırılıyor...${NC}"
    npx expo prebuild --platform android --clean
    echo -e "${GREEN}✓ Prebuild tamamlandı${NC}"
    
    # Gradle konfigürasyonunu kontrol et ve düzelt
    if [ -f "android/build.gradle" ]; then
        echo -e "${YELLOW}🔧 Gradle konfigürasyonu kontrol ediliyor...${NC}"
        
        # Android Gradle Plugin versiyonunu Expo SDK 51 için kontrol et
        if ! grep -q "com.android.tools.build:gradle:8.3" android/build.gradle; then
            echo -e "${YELLOW}Android Gradle Plugin versiyonu güncelleniyor...${NC}"
            sed -i 's/com.android.tools.build:gradle:[0-9.]*/com.android.tools.build:gradle:8.3.0/g' android/build.gradle
        fi
        
        # Gradle wrapper versiyonunu kontrol et
        if [ -f "android/gradle/wrapper/gradle-wrapper.properties" ]; then
            if ! grep -q "gradle-8.8" android/gradle/wrapper/gradle-wrapper.properties; then
                echo -e "${YELLOW}Gradle wrapper versiyonu güncelleniyor...${NC}"
                sed -i 's/distributionUrl=.*/distributionUrl=https\\:\\/\\/services.gradle.org\\/distributions\\/gradle-8.8-bin.zip/g' android/gradle/wrapper/gradle-wrapper.properties
            fi
        fi
        
        # gradle.properties dosyasını oluştur/güncelle
        mkdir -p android
        cat > android/gradle.properties << 'EOF'
# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configureondemand=true
android.useAndroidX=true
android.enableJetifier=true
android.defaults.buildfeatures.buildconfig=true
android.nonTransitiveRClass=false
android.nonFinalResIds=false
# Expo için gerekli ayarlar
expo.autolinking=true
# Hermes JavaScript Engine
hermesEnabled=true
# Kotlin daemon ayarları
kotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
EOF
        
        echo -e "${GREEN}✓ Gradle konfigürasyonu kontrol edildi${NC}"
    fi
}

# Gradle build
build_apk() {
    echo -e "${YELLOW}🏗️  APK oluşturuluyor...${NC}"
    cd android
    
    # Gradle wrapper izinlerini ayarla
    if [ -f "gradlew" ]; then
        chmod +x gradlew
    fi
    
    # Gradle daemon'ları durdur (sorunları önlemek için)
    echo -e "${YELLOW}🛑 Gradle daemon'ları durduruluyor...${NC}"
    ./gradlew --stop || true
    sleep 2
    
    # Clean build
    echo -e "${YELLOW}🧹 Clean build yapılıyor...${NC}"
    ./gradlew clean || true
    
    # Release build (daemon olmadan deneme)
    echo -e "${YELLOW}📦 Release APK build ediliyor...${NC}"
    
    # İlk deneme
    if ! ./gradlew assembleRelease --no-daemon; then
        echo -e "${YELLOW}⚠️  İlk build denemesi başarısız, daemon'ları temizleyip tekrar deniyor...${NC}"
        ./gradlew --stop || true
        sleep 3
        
        # İkinci deneme (daemon ile)
        echo -e "${YELLOW}🔄 Build tekrar deneniyor...${NC}"
        ./gradlew assembleRelease || {
            echo -e "${RED}❌ Build başarısız oldu. Lütfen hataları kontrol edin.${NC}"
            cd ..
            exit 1
        }
    fi
    
    cd ..
    echo -e "${GREEN}✓ APK başarıyla oluşturuldu${NC}"
}

# APK konumunu göster
show_apk_location() {
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        echo -e "${GREEN}================================================${NC}"
        echo -e "${GREEN}✅ BUILD BAŞARILI!${NC}"
        echo -e "${GREEN}================================================${NC}"
        echo -e "📱 APK Konumu: ${YELLOW}$APK_PATH${NC}"
        
        # APK boyutunu göster
        SIZE=$(du -h "$APK_PATH" | cut -f1)
        echo -e "📊 APK Boyutu: ${YELLOW}$SIZE${NC}"
        
        # APK'yı kopyala
        cp "$APK_PATH" "huglu-outdoor-$(date +%Y%m%d-%H%M%S).apk"
        echo -e "${GREEN}✓ APK root dizinine kopyalandı${NC}"
    else
        echo -e "${RED}❌ APK bulunamadı!${NC}"
        exit 1
    fi
}

# Ana build fonksiyonu
main() {
    check_requirements
    setup_swap
    install_dependencies
    run_prebuild
    build_apk
    show_apk_location
    
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}🎉 Build işlemi tamamlandı!${NC}"
    echo -e "${GREEN}================================================${NC}"
}

# Script'i çalıştır
main
