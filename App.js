import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import { testProductDetail } from './src/utils/testAPI';
import { testMaintenanceMode } from './src/utils/testMaintenance';
import analytics from './src/services/analytics';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import PaymentMethodScreen from './src/screens/PaymentMethodScreen';
import OrderConfirmationScreen from './src/screens/OrderConfirmationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SearchScreen from './src/screens/SearchScreen';
import CampaignsScreen from './src/screens/CampaignsScreen';
import LiveChatScreen from './src/screens/LiveChatScreen';
import LiveChatEntryScreen from './src/screens/LiveChatEntryScreen';
import FAQScreen from './src/screens/FAQScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import TwoFactorAuthScreen from './src/screens/TwoFactorAuthScreen';
import PrivacySettingsScreen from './src/screens/PrivacySettingsScreen';
import LanguageScreen from './src/screens/LanguageScreen';
import PersonalInfoScreen from './src/screens/PersonalInfoScreen';
import PhysicalStoresScreen from './src/screens/PhysicalStoresScreen';
import WalletScreen from './src/screens/WalletScreen';
import WalletTransferScreen from './src/screens/WalletTransferScreen';
import FlashDealsScreen from './src/screens/FlashDealsScreen';
import ReferralScreen from './src/screens/ReferralScreen';
import ChatHistoryScreen from './src/screens/ChatHistoryScreen';
import ShippingInformationScreen from './src/screens/ShippingInformationScreen';
import DailyRewardScreen from './src/screens/DailyRewardScreen';
import QuestScreen from './src/screens/QuestScreen';
import BadgesScreen from './src/screens/BadgesScreen';
import WelcomeBonusScreen from './src/screens/WelcomeBonusScreen';
import VIPProgramScreen from './src/screens/VIPProgramScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import SocialShareScreen from './src/screens/SocialShareScreen';
import MyAddressesScreen from './src/screens/MyAddressesScreen';
import AddAddressScreen from './src/screens/AddAddressScreen';
import ReturnRequestScreen from './src/screens/ReturnRequestScreen';
import ReturnRequestsListScreen from './src/screens/ReturnRequestsListScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import UserLevelScreen from './src/screens/UserLevelScreen';
import ProductCompareScreen from './src/screens/ProductCompareScreen';
import CommunityFeedScreen from './src/screens/CommunityFeedScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import CommunityProfileScreen from './src/screens/CommunityProfileScreen';
import CommunityDiscoverScreen from './src/screens/CommunityDiscoverScreen';
import CommunityNotificationsScreen from './src/screens/CommunityNotificationsScreen';
import CompassScreen from './src/screens/CompassScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const PRIMARY_COLOR = '#11d421';

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Shop') iconName = focused ? 'storefront' : 'storefront-outline';
          else if (route.name === 'Wishlist') iconName = focused ? 'heart' : 'heart-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="Shop" component={ProductListScreen} options={{ title: 'Mağaza' }} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} options={{ title: 'Favoriler' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

function CommunityTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'CommunityFeed') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'CommunityDiscover') iconName = focused ? 'compass' : 'compass-outline';
          else if (route.name === 'CommunityCreate') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'CommunityNotifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'CommunityProfile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="CommunityFeed" 
        component={CommunityFeedScreen} 
        options={{ title: 'Ana Akış' }} 
      />
      <Tab.Screen 
        name="CommunityDiscover" 
        component={CommunityDiscoverScreen} 
        options={{ title: 'Keşfet' }} 
      />
      <Tab.Screen 
        name="CommunityCreate" 
        component={CreatePostScreen} 
        options={{ title: 'Paylaş' }} 
      />
      <Tab.Screen 
        name="CommunityNotifications" 
        component={CommunityNotificationsScreen} 
        options={{ title: 'Bildirimler' }} 
      />
      <Tab.Screen 
        name="CommunityProfile" 
        component={CommunityProfileScreen} 
        options={{ title: 'Profil' }} 
      />
    </Tab.Navigator>
  );
}

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true); // Continue anyway
      }
    }
    loadFonts();
    
    // Analytics'i başlat
    async function initAnalytics() {
      try {
        await analytics.initialize();
        await analytics.startSession();
        // Session heartbeat - her 30 saniyede bir
        setInterval(() => {
          analytics.heartbeat();
        }, 30000);
      } catch (error) {
        console.error('Analytics initialization error:', error);
      }
    }
    initAnalytics();
    
    // BAKIM MODU TEST - Bakım modu kontrolünü test et
    setTimeout(() => {
      testMaintenanceMode();
    }, 2000);
    
    // API TEST - Ürün detay verisini kontrol et
    // setTimeout(() => {
    //   testProductDetail(556); // Test product ID
    // }, 3000); // 3 saniye sonra çalıştır
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#11d421' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <NavigationContainer
      onReady={() => {
        // Navigation hazır olduğunda analytics'i başlat
        analytics.initialize().catch(console.error);
      }}
      onStateChange={(state) => {
        // Screen değişikliklerini track et
        if (state) {
          const route = state.routes[state.index];
          if (route) {
            const screenName = route.name;
            analytics.trackScreenView(screenName).catch(console.error);
          }
        }
      }}
    >
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen 
          name="Maintenance" 
          component={MaintenanceScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="ProductCompare" component={ProductCompareScreen} />
        <Stack.Screen name="Community" component={CommunityTabs} />
        <Stack.Screen name="CommunityFeed" component={CommunityFeedScreen} />
        <Stack.Screen name="CommunityProfile" component={CommunityProfileScreen} />
        <Stack.Screen name="CreatePost" component={CreatePostScreen} />
        <Stack.Screen name="Compass" component={CompassScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
        <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Campaigns" component={CampaignsScreen} />
        <Stack.Screen name="LiveChatEntry" component={LiveChatEntryScreen} />
        <Stack.Screen name="LiveChat" component={LiveChatScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
        <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
        <Stack.Screen name="PhysicalStores" component={PhysicalStoresScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="WalletTransfer" component={WalletTransferScreen} />
        <Stack.Screen name="UserLevel" component={UserLevelScreen} />
        <Stack.Screen name="FlashDeals" component={FlashDealsScreen} />
        <Stack.Screen name="Referral" component={ReferralScreen} />
        <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} />
        <Stack.Screen name="ShippingInformation" component={ShippingInformationScreen} />
        <Stack.Screen name="MyAddresses" component={MyAddressesScreen} />
        <Stack.Screen name="AddAddress" component={AddAddressScreen} />
        <Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} />
        <Stack.Screen name="ReturnRequests" component={ReturnRequestsListScreen} />
        <Stack.Screen name="Invoices" component={InvoicesScreen} />
        <Stack.Screen name="DailyReward" component={DailyRewardScreen} />
        <Stack.Screen name="Quest" component={QuestScreen} />
        <Stack.Screen name="Badges" component={BadgesScreen} />
        <Stack.Screen name="WelcomeBonus" component={WelcomeBonusScreen} />
        <Stack.Screen name="VIPProgram" component={VIPProgramScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="SocialShare" component={SocialShareScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
