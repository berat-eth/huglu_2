/**
 * Platform Brain - Event Adapter
 * 
 * Converts existing backend actions into normalized events for the Platform Brain.
 * This adapter listens to existing endpoints and creates standardized events without
 * modifying the original behavior.
 */

const EventTracker = require('../event-tracker');

class EventAdapter {
  constructor() {
    this.eventTracker = new EventTracker();
    this.enabled = false; // Controlled by feature flag
  }

  /**
   * Enable/disable the adapter
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Check if adapter is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Adapt product view event
   */
  async adaptProductView({ tenantId, userId, deviceId, sessionId, productId, productData }) {
    if (!this.enabled) return null;

    try {
      const event = {
        tenantId,
        userId,
        deviceId,
        sessionId,
        eventType: 'product_view',
        screenName: 'product_detail',
        properties: {
          productId,
          productName: productData?.name,
          categoryId: productData?.categoryId,
          price: productData?.price,
          source: 'platform_brain'
        },
        timestamp: new Date()
      };

      // Track in existing system (non-blocking)
      this.eventTracker.trackEvent(event).catch(err => {
        console.warn('⚠️ Platform Brain: Failed to track product view:', err.message);
      });

      return event;
    } catch (error) {
      console.error('❌ Platform Brain Event Adapter: Error adapting product view:', error);
      return null;
    }
  }

  /**
   * Adapt cart add event
   */
  async adaptCartAdd({ tenantId, userId, deviceId, sessionId, productId, quantity, price }) {
    if (!this.enabled) return null;

    try {
      const event = {
        tenantId,
        userId,
        deviceId,
        sessionId,
        eventType: 'add_to_cart',
        screenName: 'cart',
        properties: {
          productId,
          quantity,
          price,
          totalValue: quantity * price,
          source: 'platform_brain'
        },
        timestamp: new Date()
      };

      this.eventTracker.trackEvent(event).catch(err => {
        console.warn('⚠️ Platform Brain: Failed to track cart add:', err.message);
      });

      return event;
    } catch (error) {
      console.error('❌ Platform Brain Event Adapter: Error adapting cart add:', error);
      return null;
    }
  }

  /**
   * Adapt order creation event
   */
  async adaptOrderCreate({ tenantId, userId, deviceId, sessionId, orderId, orderData }) {
    if (!this.enabled) return null;

    try {
      const event = {
        tenantId,
        userId,
        deviceId,
        sessionId,
        eventType: 'purchase',
        screenName: 'order_confirmation',
        properties: {
          orderId,
          totalAmount: orderData?.totalAmount,
          itemCount: orderData?.itemCount,
          paymentMethod: orderData?.paymentMethod,
          source: 'platform_brain'
        },
        timestamp: new Date()
      };

      this.eventTracker.trackEvent(event).catch(err => {
        console.warn('⚠️ Platform Brain: Failed to track order create:', err.message);
      });

      return event;
    } catch (error) {
      console.error('❌ Platform Brain Event Adapter: Error adapting order create:', error);
      return null;
    }
  }

  /**
   * Adapt search event
   */
  async adaptSearch({ tenantId, userId, deviceId, sessionId, query, resultsCount }) {
    if (!this.enabled) return null;

    try {
      const event = {
        tenantId,
        userId,
        deviceId,
        sessionId,
        eventType: 'search',
        screenName: 'search',
        properties: {
          query,
          resultsCount,
          source: 'platform_brain'
        },
        timestamp: new Date()
      };

      this.eventTracker.trackEvent(event).catch(err => {
        console.warn('⚠️ Platform Brain: Failed to track search:', err.message);
      });

      return event;
    } catch (error) {
      console.error('❌ Platform Brain Event Adapter: Error adapting search:', error);
      return null;
    }
  }

  /**
   * Adapt generic event from existing event tracker
   */
  async adaptGenericEvent(eventData) {
    if (!this.enabled) return null;

    try {
      // Add platform brain marker
      const adaptedEvent = {
        ...eventData,
        properties: {
          ...eventData.properties,
          source: 'platform_brain',
          adaptedAt: new Date().toISOString()
        }
      };

      return adaptedEvent;
    } catch (error) {
      console.error('❌ Platform Brain Event Adapter: Error adapting generic event:', error);
      return null;
    }
  }
}

module.exports = EventAdapter;

