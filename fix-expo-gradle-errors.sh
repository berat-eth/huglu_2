#!/bin/bash

# Expo SDK 51 Gradle Build Hatalarını Düzeltme Scripti
# Linux sunucusu için özel düzeltmeler

set -e

echo "🔧 Expo Gradle Build Hataları Düzeltiliyor..."
echo "================================================"

# Renk kodları
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Android klasörünü kontrol et
if [ ! -d "android" ]; then
    echo -e "${YELLOW}📦 Android klasörü bulunamadı, prebuild çalıştırılıyor...${NC}"
    npx expo prebuild --platform android --clean
fi

# 2. Root build.gradle dosyasını kontrol et ve düzelt
if [ -f "android/build.gradle" ]; then
    echo -e "${YELLOW}[1/5] Root build.gradle düzeltiliyor...${NC}"
    
    # Maven plugin'ini ekle (eğer yoksa)
    if ! grep -q "apply plugin: 'maven'" android/build.gradle && ! grep -q "id 'maven'" android/build.gradle; then
        echo -e "${YELLOW}Maven plugin'i ekleniyor...${NC}"
        
        # buildscript bloğunu kontrol et
        if grep -q "buildscript" android/build.gradle; then
            # buildscript bloğuna maven plugin'ini ekle
            sed -i '/buildscript {/,/}/ {
                /dependencies {/a\
        classpath "com.android.tools.build:gradle:8.3.0"
            }' android/build.gradle
            
            # plugins bloğuna maven ekle (eğer plugins bloğu varsa)
            if grep -q "plugins {" android/build.gradle; then
                sed -i '/plugins {/a\
    id "maven" apply false
' android/build.gradle
            fi
        else
            # buildscript bloğu yoksa, en başa ekle
            cat > android/build.gradle.tmp << 'EOF'
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 23
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "25.1.8937393"
        kotlinVersion = "1.9.0"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.3.0")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
}

plugins {
    id "maven" apply false
}

allprojects {
    repositories {
        maven {
            url("https://www.jitpack.io")
        }
        maven {
            url("https://maven.google.com")
        }
        google()
        mavenCentral()
    }
}

EOF
            cat android/build.gradle >> android/build.gradle.tmp
            mv android/build.gradle.tmp android/build.gradle
        fi
    fi
    
    # Android Gradle Plugin versiyonunu kontrol et
    if ! grep -q "com.android.tools.build:gradle:8.3" android/build.gradle; then
        echo -e "${YELLOW}Android Gradle Plugin versiyonu güncelleniyor...${NC}"
        sed -i 's/com.android.tools.build:gradle:[0-9.]*/com.android.tools.build:gradle:8.3.0/g' android/build.gradle
    fi
    
    echo -e "${GREEN}✓ Root build.gradle düzeltildi${NC}"
else
    echo -e "${RED}❌ android/build.gradle bulunamadı!${NC}"
    echo -e "${YELLOW}Prebuild çalıştırılıyor...${NC}"
    npx expo prebuild --platform android --clean
fi

# 3. Gradle wrapper versiyonunu kontrol et ve güncelle
if [ -f "android/gradle/wrapper/gradle-wrapper.properties" ]; then
    echo -e "${YELLOW}[2/5] Gradle wrapper versiyonu güncelleniyor...${NC}"
    
    if ! grep -q "gradle-8.8" android/gradle/wrapper/gradle-wrapper.properties; then
        sed -i 's/distributionUrl=.*/distributionUrl=https\\:\\/\\/services.gradle.org\\/distributions\\/gradle-8.8-bin.zip/g' android/gradle/wrapper/gradle-wrapper.properties
        echo -e "${GREEN}✓ Gradle wrapper 8.8'e güncellendi${NC}"
    else
        echo -e "${GREEN}✓ Gradle wrapper zaten 8.8${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Gradle wrapper properties bulunamadı, oluşturuluyor...${NC}"
    mkdir -p android/gradle/wrapper
    cat > android/gradle/wrapper/gradle-wrapper.properties << 'EOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.8-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF
fi

# 4. gradle.properties dosyasını oluştur/güncelle
echo -e "${YELLOW}[3/5] gradle.properties güncelleniyor...${NC}"
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
android.defaults.buildfeatures.buildconfig=false
android.nonTransitiveRClass=false
android.nonFinalResIds=false
# Expo için gerekli ayarlar
expo.autolinking=true
# Hermes JavaScript Engine
hermesEnabled=true
# Kotlin daemon ayarları
kotlin.daemon.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
EOF
echo -e "${GREEN}✓ gradle.properties güncellendi${NC}"

# 5. settings.gradle dosyasını kontrol et
if [ -f "android/settings.gradle" ]; then
    echo -e "${YELLOW}[4/5] settings.gradle kontrol ediliyor...${NC}"
    
    # Expo modules core plugin'inin doğru yüklendiğinden emin ol
    if ! grep -q "expo-modules-core" android/settings.gradle; then
        echo -e "${YELLOW}⚠️  expo-modules-core settings.gradle'de bulunamadı${NC}"
    fi
    
    # Maven repository ekle (eğer yoksa)
    if ! grep -q "mavenCentral()" android/settings.gradle; then
        echo -e "${YELLOW}Maven Central repository ekleniyor...${NC}"
        sed -i '/repositories {/a\
        mavenCentral()
' android/settings.gradle
    fi
    
    echo -e "${GREEN}✓ settings.gradle kontrol edildi${NC}"
else
    echo -e "${YELLOW}⚠️  settings.gradle bulunamadı, prebuild gerekli${NC}"
fi

# 6. app/build.gradle dosyasını kontrol et
if [ -f "android/app/build.gradle" ]; then
    echo -e "${YELLOW}[5/5] app/build.gradle kontrol ediliyor...${NC}"
    
    # Maven plugin'ini ekle (eğer yoksa)
    if ! grep -q "apply plugin: 'maven'" android/app/build.gradle && ! grep -q "id 'maven'" android/app/build.gradle; then
        echo -e "${YELLOW}app/build.gradle'e maven plugin'i ekleniyor...${NC}"
        # plugins bloğuna ekle veya apply plugin satırı ekle
        if grep -q "plugins {" android/app/build.gradle; then
            sed -i '/plugins {/a\
    id "maven"
' android/app/build.gradle
        else
            sed -i '1i\
apply plugin: "maven"
' android/app/build.gradle
        fi
    fi
    
    echo -e "${GREEN}✓ app/build.gradle kontrol edildi${NC}"
fi

# 7. Gradle wrapper izinlerini ayarla
if [ -f "android/gradlew" ]; then
    chmod +x android/gradlew
    echo -e "${GREEN}✓ Gradle wrapper izinleri ayarlandı${NC}"
fi

# 8. Gradle cache'i temizle
echo -e "${YELLOW}🧹 Gradle cache temizleniyor...${NC}"
cd android
if [ -f "gradlew" ]; then
    ./gradlew clean --no-daemon || true
    ./gradlew --stop || true
fi
cd ..

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Düzeltme işlemi tamamlandı!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "${BLUE}Şimdi build işlemini tekrar deneyin:${NC}"
echo -e "${YELLOW}cd android && ./gradlew clean && ./gradlew assembleRelease${NC}"

