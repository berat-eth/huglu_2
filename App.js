import React, { useEffect, useState, lazy, Suspense } from 'react';
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

// Kritik ekranlar - statik import (hızlı erişim için)
import SplashScreen from './src/screens/SplashScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WishlistScreen from './src/screens/WishlistScreen';

// Lazy loading - sadece gerektiğinde yüklenecek
const SignUpScreen = lazy(() => import('./src/screens/SignUpScreen'));
const ForgotPasswordScreen = lazy(() => import('./src/screens/ForgotPasswordScreen'));
const ProductDetailScreen = lazy(() => import('./src/screens/ProductDetailScreen'));
const CartScreen = lazy(() => import('./src/screens/CartScreen'));
const PaymentMethodScreen = lazy(() => import('./src/screens/PaymentMethodScreen'));
const OrderConfirmationScreen = lazy(() => import('./src/screens/OrderConfirmationScreen'));
const OrderTrackingScreen = lazy(() => import('./src/screens/OrderTrackingScreen'));
const PickupOrdersScreen = lazy(() => import('./src/screens/PickupOrdersScreen'));
const OrderDetailScreen = lazy(() => import('./src/screens/OrderDetailScreen'));
const NotificationsScreen = lazy(() => import('./src/screens/NotificationsScreen'));
const SearchScreen = lazy(() => import('./src/screens/SearchScreen'));
const CampaignsScreen = lazy(() => import('./src/screens/CampaignsScreen'));
const LiveChatScreen = lazy(() => import('./src/screens/LiveChatScreen'));
const LiveChatEntryScreen = lazy(() => import('./src/screens/LiveChatEntryScreen'));
const FAQScreen = lazy(() => import('./src/screens/FAQScreen'));
const SettingsScreen = lazy(() => import('./src/screens/SettingsScreen'));
const TermsOfServiceScreen = lazy(() => import('./src/screens/TermsOfServiceScreen'));
const PrivacyPolicyScreen = lazy(() => import('./src/screens/PrivacyPolicyScreen'));
const ChangePasswordScreen = lazy(() => import('./src/screens/ChangePasswordScreen'));
const TwoFactorAuthScreen = lazy(() => import('./src/screens/TwoFactorAuthScreen'));
const PrivacySettingsScreen = lazy(() => import('./src/screens/PrivacySettingsScreen'));
const LanguageScreen = lazy(() => import('./src/screens/LanguageScreen'));
const PersonalInfoScreen = lazy(() => import('./src/screens/PersonalInfoScreen'));
const PhysicalStoresScreen = lazy(() => import('./src/screens/PhysicalStoresScreen'));
const WalletScreen = lazy(() => import('./src/screens/WalletScreen'));
const WalletTransferScreen = lazy(() => import('./src/screens/WalletTransferScreen'));
const FlashDealsScreen = lazy(() => import('./src/screens/FlashDealsScreen'));
const ReferralScreen = lazy(() => import('./src/screens/ReferralScreen'));
const ChatHistoryScreen = lazy(() => import('./src/screens/ChatHistoryScreen'));
const ShippingInformationScreen = lazy(() => import('./src/screens/ShippingInformationScreen'));
const DailyRewardScreen = lazy(() => import('./src/screens/DailyRewardScreen'));
const QuestScreen = lazy(() => import('./src/screens/QuestScreen'));
const WelcomeBonusScreen = lazy(() => import('./src/screens/WelcomeBonusScreen'));
const SocialShareScreen = lazy(() => import('./src/screens/SocialShareScreen'));
const MyAddressesScreen = lazy(() => import('./src/screens/MyAddressesScreen'));
const AddAddressScreen = lazy(() => import('./src/screens/AddAddressScreen'));
const ReturnRequestScreen = lazy(() => import('./src/screens/ReturnRequestScreen'));
const ReturnRequestsListScreen = lazy(() => import('./src/screens/ReturnRequestsListScreen'));
const InvoicesScreen = lazy(() => import('./src/screens/InvoicesScreen'));
const UserLevelScreen = lazy(() => import('./src/screens/UserLevelScreen'));
const ProductCompareScreen = lazy(() => import('./src/screens/ProductCompareScreen'));
const CommunityFeedScreen = lazy(() => import('./src/screens/CommunityFeedScreen'));
const CreatePostScreen = lazy(() => import('./src/screens/CreatePostScreen'));
const CommunityProfileScreen = lazy(() => import('./src/screens/CommunityProfileScreen'));
const CommunityDiscoverScreen = lazy(() => import('./src/screens/CommunityDiscoverScreen'));
const CommunityNotificationsScreen = lazy(() => import('./src/screens/CommunityNotificationsScreen'));
const CommunityRulesScreen = lazy(() => import('./src/screens/CommunityRulesScreen'));

// Loading component
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <ActivityIndicator size="large" color="#11d421" />
  </View>
);

// Lazy wrapper component
const LazyScreen = ({ component: Component, ...props }) => (
  <Suspense fallback={<ScreenLoader />}>
    <Component {...props} />
  </Suspense>
);

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
        options={{ title: 'Ana Akış' }}
      >
        {props => <LazyScreen component={CommunityFeedScreen} {...props} />}
      </Tab.Screen>
      <Tab.Screen 
        name="CommunityDiscover" 
        options={{ title: 'Keşfet' }}
      >
        {props => <LazyScreen component={CommunityDiscoverScreen} {...props} />}
      </Tab.Screen>
      <Tab.Screen 
        name="CommunityCreate" 
        options={{ title: 'Paylaş' }}
      >
        {props => <LazyScreen component={CreatePostScreen} {...props} />}
      </Tab.Screen>
      <Tab.Screen 
        name="CommunityNotifications" 
        options={{ title: 'Bildirimler' }}
      >
        {props => <LazyScreen component={CommunityNotificationsScreen} {...props} />}
      </Tab.Screen>
      <Tab.Screen 
        name="CommunityProfile" 
        options={{ title: 'Profil' }}
      >
        {props => <LazyScreen component={CommunityProfileScreen} {...props} />}
      </Tab.Screen>
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
        <Stack.Screen name="SignUp">
          {props => <LazyScreen component={SignUpScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="ForgotPassword">
          {props => <LazyScreen component={ForgotPasswordScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ProductDetail">
          {props => <LazyScreen component={ProductDetailScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="ProductCompare">
          {props => <LazyScreen component={ProductCompareScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Community" component={CommunityTabs} />
        <Stack.Screen name="CommunityFeed">
          {props => <LazyScreen component={CommunityFeedScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="CommunityProfile">
          {props => <LazyScreen component={CommunityProfileScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="CommunityRules">
          {props => <LazyScreen component={CommunityRulesScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="CreatePost">
          {props => <LazyScreen component={CreatePostScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Cart">
          {props => <LazyScreen component={CartScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="PaymentMethod">
          {props => <LazyScreen component={PaymentMethodScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="OrderConfirmation">
          {props => <LazyScreen component={OrderConfirmationScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="OrderTracking">
          {props => <LazyScreen component={OrderTrackingScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="PickupOrders">
          {props => <LazyScreen component={PickupOrdersScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="OrderDetail">
          {props => <LazyScreen component={OrderDetailScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Notifications">
          {props => <LazyScreen component={NotificationsScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Search">
          {props => <LazyScreen component={SearchScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Campaigns">
          {props => <LazyScreen component={CampaignsScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="LiveChatEntry">
          {props => <LazyScreen component={LiveChatEntryScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="LiveChat">
          {props => <LazyScreen component={LiveChatScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="FAQ">
          {props => <LazyScreen component={FAQScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {props => <LazyScreen component={SettingsScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="TermsOfService">
          {props => <LazyScreen component={TermsOfServiceScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="PrivacyPolicy">
          {props => <LazyScreen component={PrivacyPolicyScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="ChangePassword">
          {props => <LazyScreen component={ChangePasswordScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="TwoFactorAuth">
          {props => <LazyScreen component={TwoFactorAuthScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="PrivacySettings">
          {props => <LazyScreen component={PrivacySettingsScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Language">
          {props => <LazyScreen component={LanguageScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="PersonalInfo">
          {props => <LazyScreen component={PersonalInfoScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="PhysicalStores">
          {props => <LazyScreen component={PhysicalStoresScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Wallet">
          {props => <LazyScreen component={WalletScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="WalletTransfer">
          {props => <LazyScreen component={WalletTransferScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="UserLevel">
          {props => <LazyScreen component={UserLevelScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="FlashDeals">
          {props => <LazyScreen component={FlashDealsScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Referral">
          {props => <LazyScreen component={ReferralScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="ChatHistory">
          {props => <LazyScreen component={ChatHistoryScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="ShippingInformation">
          {props => <LazyScreen component={ShippingInformationScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="MyAddresses">
          {props => <LazyScreen component={MyAddressesScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="AddAddress">
          {props => <LazyScreen component={AddAddressScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="ReturnRequest">
          {props => <LazyScreen component={ReturnRequestScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="ReturnRequests">
          {props => <LazyScreen component={ReturnRequestsListScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Invoices">
          {props => <LazyScreen component={InvoicesScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="DailyReward">
          {props => <LazyScreen component={DailyRewardScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Quest">
          {props => <LazyScreen component={QuestScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="WelcomeBonus">
          {props => <LazyScreen component={WelcomeBonusScreen} {...props} />}
        </Stack.Screen>
        <Stack.Screen name="SocialShare">
          {props => <LazyScreen component={SocialShareScreen} {...props} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
