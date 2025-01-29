import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { redis } from './redis.config';
import Redis, { ChainableCommander } from 'ioredis';

/**
 * Service for handling Redis operations in a NestJS application.
 * Provides methods for key-value operations, hash operations, list operations,
 * set operations, sorted set operations, and utility functions.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor() {}

  /**
   * Cleanup method called when the module is being destroyed.
   * Closes the Redis connection gracefully.
   */
  async onModuleDestroy() {
    await redis.quit();
  }

  /**
   * Returns the underlying Redis client instance.
   * @returns {Redis} The Redis client instance
   */
  getClient(): Redis {
    return redis;
  }

  /**
   * Sets a key-value pair in Redis.
   * @param {string} key - The key to set
   * @param {string | number | Buffer} value - The value to store
   * @returns {Promise<'OK'>} Promise resolving to 'OK' on success
   */
  async setValue(key: string, value: string | number | Buffer): Promise<'OK'> {
    return await redis.set(key, value);
  }

  /**
   * Retrieves the value for a given key.
   * @param {string} key - The key to retrieve
   * @returns {Promise<string | null>} Promise resolving to the value or null if not found
   */
  async getValue(key: string): Promise<string | null> {
    return await redis.get(key);
  }

  /**
   * Deletes one or more keys from Redis.
   * @param {string | string[]} key - Single key or array of keys to delete
   * @returns {Promise<number>} Promise resolving to the number of keys deleted
   */
  async deleteKey(key: string | string[]): Promise<number> {
    return Array.isArray(key) ? await redis.del(...key) : await redis.del(key);
  }

  /**
   * Checks if a key exists in Redis.
   * @param {string} key - The key to check
   * @returns {Promise<boolean>} Promise resolving to true if key exists, false otherwise
   */
  async hasKey(key: string): Promise<boolean> {
    return (await redis.exists(key)) === 1;
  }

  /**
   * Sets a key-value pair with an expiration time.
   * @param {string} key - The key to set
   * @param {string | number | Buffer} value - The value to store
   * @param {number} seconds - Time in seconds until the key expires
   * @returns {Promise<'OK'>} Promise resolving to 'OK' on success
   */
  async setValueWithExpiry(
    key: string,
    value: string | number | Buffer,
    seconds: number,
  ): Promise<'OK'> {
    return await redis.setex(key, seconds, value);
  }

  /**
   * Sets a field in a Redis hash.
   * @param {string} key - The hash key
   * @param {string} field - The field to set
   * @param {string | number} value - The value to store
   * @returns {Promise<number>} Promise resolving to 1 if field is new, 0 if field was updated
   */
  async hSet(
    key: string,
    field: string,
    value: string | number,
  ): Promise<number> {
    return await redis.hset(key, field, value);
  }

  /**
   * Retrieves a field from a Redis hash.
   * @param {string} key - The hash key
   * @param {string} field - The field to retrieve
   * @returns {Promise<string | null>} Promise resolving to the field's value or null if not found
   */
  async hGet(key: string, field: string): Promise<string | null> {
    return await redis.hget(key, field);
  }

  /**
   * Retrieves all fields and values from a Redis hash.
   * @param {string} key - The hash key
   * @returns {Promise<Record<string, string>>} Promise resolving to an object containing all fields and values
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    return await redis.hgetall(key);
  }

  /**
   * Pushes one or more elements to the right of a Redis list.
   * @param {string} key - The list key
   * @param {...(string | number)[]} values - Values to push
   * @returns {Promise<number>} Promise resolving to the length of the list after push
   */
  async listPush(key: string, ...values: (string | number)[]): Promise<number> {
    return await redis.rpush(key, ...values);
  }

  /**
   * Retrieves elements from a Redis list within the specified range.
   * @param {string} key - The list key
   * @param {number} start - Start index
   * @param {number} stop - Stop index
   * @returns {Promise<string[]>} Promise resolving to array of elements
   */
  async listRange(key: string, start: number, stop: number): Promise<string[]> {
    return await redis.lrange(key, start, stop);
  }

  /**
   * Adds one or more members to a Redis set.
   * @param {string} key - The set key
   * @param {...(string | number)[]} members - Members to add
   * @returns {Promise<number>} Promise resolving to the number of new members added
   */
  async setAdd(key: string, ...members: (string | number)[]): Promise<number> {
    return await redis.sadd(key, ...members);
  }

  /**
   * Retrieves all members of a Redis set.
   * @param {string} key - The set key
   * @returns {Promise<string[]>} Promise resolving to array of set members
   */
  async setMembers(key: string): Promise<string[]> {
    return await redis.smembers(key);
  }

  /**
   * Adds a member with a score to a Redis sorted set.
   * @param {string} key - The sorted set key
   * @param {number} score - Score for the member
   * @param {string} member - Member to add
   * @returns {Promise<number>} Promise resolving to 1 if member is new, 0 if score was updated
   */
  async sortedSetAdd(
    key: string,
    score: number,
    member: string,
  ): Promise<number> {
    return await redis.zadd(key, score, member);
  }

  /**
   * Retrieves members from a Redis sorted set within the specified range.
   * @param {string} key - The sorted set key
   * @param {number} start - Start index
   * @param {number} stop - Stop index
   * @returns {Promise<string[]>} Promise resolving to array of members
   */
  async sortedSetRange(
    key: string,
    start: number,
    stop: number,
  ): Promise<string[]> {
    return await redis.zrange(key, start, stop);
  }

  /**
   * Executes multiple Redis commands in a pipeline.
   * @param {(pipeline: ChainableCommander) returns void} operations - Function that defines pipeline operations
   * @returns {Promise<any[]>} Promise resolving to array of operation results
   */
  async executeTransaction(
    operations: (pipeline: ChainableCommander) => void,
  ): Promise<any[]> {
    const pipeline = redis.pipeline();
    operations(pipeline);
    return await pipeline.exec();
  }

  /**
   * Gets the remaining time to live for a key.
   * @param {string} key - The key to check
   * @returns {Promise<number>} Promise resolving to TTL in seconds, -2 if key doesn't exist, -1 if key has no TTL
   */
  async getTtl(key: string): Promise<number> {
    return await redis.ttl(key);
  }

  /**
   * Pings the Redis server.
   * @returns {Promise<string>} Promise resolving to "PONG"
   */
  async ping(): Promise<string> {
    return await redis.ping();
  }

  /**
   * Finds all keys matching the specified pattern.
   * @param {string} pattern - Pattern to match (e.g., "user:*")
   * @returns {Promise<string[]>} Promise resolving to array of matching keys
   * @warning Use with caution in production as it may impact performance with large datasets
   */
  async keys(pattern: string): Promise<string[]> {
    return await redis.keys(pattern);
  }
}
