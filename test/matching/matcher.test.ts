import { findServiceWithConfidence, clearMatcherCache } from '../../src/matching';
import { getConfig, clearConfigCache } from '../../src/config';
import { Config } from '../../src/config/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock the config module
jest.mock('../../src/config');

// Load sample config
const sampleConfigPath = path.join(__dirname, '../fixtures/sample-config.json');
const sampleConfig = JSON.parse(fs.readFileSync(sampleConfigPath, 'utf-8')) as Config;

describe('Fuzzy Matching Module', () => {
  beforeEach(() => {
    // Clear all caches before each test
    clearMatcherCache();
    clearConfigCache();
    jest.clearAllMocks();
  });

  describe('Exact matches', () => {
    it('should match "Customer Service" exactly with 100% confidence', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('Customer Service');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Customer Service');
      expect(result?.matchConfidence).toBeGreaterThanOrEqual(0.99); // Very close to 100%
      expect(result?.repository).toBe('https://github.com/company/customer-service');
      expect(result?.local_path).toBe('~/workspace/customer-service');
    });

    it('should match "Payment API" exactly', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('Payment API');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Payment API');
      expect(result?.matchConfidence).toBeGreaterThanOrEqual(0.99);
    });
  });

  describe('Case variations', () => {
    it('should match "customer-service" to "Customer Service" with >85% confidence', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('customer-service');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Customer Service');
      expect(result?.matchConfidence).toBeGreaterThan(0.85);
    });

    it('should match "CUSTOMER SERVICE" to "Customer Service"', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('CUSTOMER SERVICE');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Customer Service');
      expect(result?.matchConfidence).toBeGreaterThan(0.85);
    });

    it('should match "customer_service" to "Customer Service"', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('customer_service');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Customer Service');
      expect(result?.matchConfidence).toBeGreaterThan(0.85);
    });
  });

  describe('Partial matches', () => {
    it('should match "Megamind" to "Megamind Service" with >85% confidence', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('Megamind');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Megamind Service');
      expect(result?.matchConfidence).toBeGreaterThan(0.85);
    });

    it('should match "Garcon" to "Garcon Order Service"', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('Garcon');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Garcon Order Service');
      expect(result?.matchConfidence).toBeGreaterThan(0.85);
    });

    it('should match "Payment" to "Payment API"', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('Payment');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Payment API');
      expect(result?.matchConfidence).toBeGreaterThan(0.85);
    });
  });

  describe('Threshold rejection', () => {
    it('should NOT match "User Service" to "Customer Service" (<85% confidence)', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('User Service');

      // Should either return null or if it matches, should be below threshold
      if (result) {
        // If it did match something, it should be Customer Service
        expect(result.name).toBe('Customer Service');
        // But the actual function should have rejected it due to low confidence
        // Since our function returns null for low confidence, this should not happen
        fail('Should not have matched with low confidence');
      } else {
        expect(result).toBeNull();
      }
    });

    it('should NOT match "Order Management" to any service', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('Order Management');

      // Might match "Garcon Order Service" but should be below threshold
      expect(result).toBeNull();
    });

    it('should match with normalized substring matching', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      // String matching is case-insensitive and handles normalized forms
      const result = await findServiceWithConfidence('customer-service', 0.99);

      // Should match "Customer Service" via normalization
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Customer Service');
    });
  });

  describe('No match scenarios', () => {
    it('should return null for external service "Stripe"', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('Stripe');

      expect(result).toBeNull();
    });

    it('should return null for "SendGrid"', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('SendGrid');

      expect(result).toBeNull();
    });

    it('should return null for completely unrelated service', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('RandomServiceName');

      expect(result).toBeNull();
    });
  });

  describe('Empty config handling', () => {
    it('should return null when config is null', async () => {
      (getConfig as jest.Mock).mockResolvedValue(null);

      const result = await findServiceWithConfidence('Customer Service');

      expect(result).toBeNull();
    });

    it('should return null when services array is empty', async () => {
      (getConfig as jest.Mock).mockResolvedValue({
        version: '1.0.0',
        services: [],
        standards_repo: 'https://example.com/standards'
      });

      const result = await findServiceWithConfidence('Customer Service');

      expect(result).toBeNull();
    });

    it('should return null when services is undefined', async () => {
      (getConfig as jest.Mock).mockResolvedValue({
        version: '1.0.0',
        standards_repo: 'https://example.com/standards'
      });

      const result = await findServiceWithConfidence('Customer Service');

      expect(result).toBeNull();
    });
  });

  describe('Cache behavior', () => {
    it('should use cached matcher for multiple calls', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      // First call
      await findServiceWithConfidence('Customer Service');
      expect(getConfig).toHaveBeenCalledTimes(1);

      // Second call should use cached matcher
      await findServiceWithConfidence('Payment API');
      expect(getConfig).toHaveBeenCalledTimes(1); // Still only called once

      // Third call
      await findServiceWithConfidence('Megamind');
      expect(getConfig).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should return same instance for multiple searches', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result1 = await findServiceWithConfidence('Customer Service');
      const result2 = await findServiceWithConfidence('Customer Service');

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1?.name).toBe(result2?.name);
      expect(getConfig).toHaveBeenCalledTimes(1);
    });

    it('should not reload config after failed load', async () => {
      (getConfig as jest.Mock).mockResolvedValue(null);

      // First call - config returns null
      await findServiceWithConfidence('Customer Service');
      expect(getConfig).toHaveBeenCalledTimes(1);

      // Second call - should remember config was null
      await findServiceWithConfidence('Payment API');
      expect(getConfig).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('Cache clearing', () => {
    it('should reload config after clearMatcherCache()', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      // First call
      await findServiceWithConfidence('Customer Service');
      expect(getConfig).toHaveBeenCalledTimes(1);

      // Clear cache
      clearMatcherCache();

      // Next call should reload config
      await findServiceWithConfidence('Payment API');
      expect(getConfig).toHaveBeenCalledTimes(2);
    });

    it('should allow config changes after cache clear', async () => {
      // First, set up with sample config
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);
      const result1 = await findServiceWithConfidence('Customer Service');
      expect(result1).not.toBeNull();

      // Clear cache
      clearMatcherCache();

      // Change config to return null
      (getConfig as jest.Mock).mockResolvedValue(null);
      const result2 = await findServiceWithConfidence('Customer Service');
      expect(result2).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string input', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      const result = await findServiceWithConfidence('');

      expect(result).toBeNull();
    });

    it('should handle very short input', async () => {
      (getConfig as jest.Mock).mockResolvedValue(sampleConfig);

      // Fuse.js has minMatchCharLength: 2
      const result = await findServiceWithConfidence('C');

      expect(result).toBeNull();
    });

    it('should handle special characters in service names', async () => {
      const configWithSpecialChars = {
        ...sampleConfig,
        services: [
          ...sampleConfig.services,
          {
            name: 'Auth@Service-2.0',
            repository: 'https://github.com/company/auth-service-v2'
          }
        ]
      };
      (getConfig as jest.Mock).mockResolvedValue(configWithSpecialChars);

      const result = await findServiceWithConfidence('Auth@Service-2.0');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Auth@Service-2.0');
    });
  });
});