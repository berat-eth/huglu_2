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
    npm install
    echo -e "${GREEN}✓ Bağımlılıklar yüklendi${NC}"
}

# Expo prebuild
run_prebuild() {
    echo -e "${YELLOW}🔧 Expo prebuild çalıştırılıyor...${NC}"
    npx expo prebuild --platform android --clean
    echo -e "${GREEN}✓ Prebuild tamamlandı${NC}"
}

# Gradle build
build_apk() {
    echo -e "${YELLOW}🏗️  APK oluşturuluyor...${NC}"
    cd android
    ./gradlew assembleRelease
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
