/**
 * API 请求验证中间件
 * 使用 Zod schemas 验证请求参数、查询字符串和 body
 */

import { createLogger } from '../logger.js';
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

const log = createLogger('validate');

/**
 * 验证请求的中间件工厂函数
 * @param schema - Zod schema 对象
 * @param source - 验证来源 ('body' | 'query' | 'params')
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 根据来源选择要验证的数据
      const dataToValidate = req[source];

      // 执行验证
      const validatedData = await schema.parseAsync(dataToValidate);

      // 将验证后的数据存储到 req.validated
      // @ts-ignore - 动态添加属性
      if (!req.validated) req.validated = {};
      // @ts-ignore
      req.validated[source] = validatedData;

      // 同时更新原始数据为验证后的数据 (包含默认值)
      req[source] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // 格式化 Zod 错误信息
        const formattedErrors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          message: '请求数据验证失败',
          details: formattedErrors
        });
      }

      // 其他未知错误
      log.error({ err: error }, 'Validation middleware error');
      return res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: '验证过程发生错误'
      });
    }
  };
}

/**
 * 组合多个验证中间件
 * 用于同时验证 body, query, params
 */
export function validateAll(schemas: {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}) {
  const middlewares: Array<ReturnType<typeof validate>> = [];

  if (schemas.body) {
    middlewares.push(validate(schemas.body, 'body'));
  }
  if (schemas.query) {
    middlewares.push(validate(schemas.query, 'query'));
  }
  if (schemas.params) {
    middlewares.push(validate(schemas.params, 'params'));
  }

  return middlewares;
}

/**
 * 验证请求 body
 */
export const validateBody = <T extends z.ZodTypeAny>(schema: T) =>
  validate(schema, 'body');

/**
 * 验证查询参数
 */
export const validateQuery = <T extends z.ZodTypeAny>(schema: T) =>
  validate(schema, 'query');

/**
 * 验证路径参数
 */
export const validateParams = <T extends z.ZodTypeAny>(schema: T) =>
  validate(schema, 'params');

// TypeScript 类型扩展
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}
