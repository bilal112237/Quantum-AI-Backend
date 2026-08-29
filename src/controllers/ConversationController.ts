import type { Request, Response, NextFunction } from 'express';
import { conversationService } from '../services/ConversationService.js';
import { sendSuccess } from '../utils/helpers.js';
import { getRouteParam } from '../utils/params.js';

function parseArchivedParam(value: unknown): boolean | 'all' | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'all') return 'all';
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

export class ConversationController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conv = await conversationService.create(req.userId!, req.body.title, req.body.documentIds);
      return sendSuccess(res, conv, 201);
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
      const skip = req.query.skip != null ? Number(req.query.skip) : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const archived = parseArchivedParam(req.query.archived);
      const result = await conversationService.list(req.userId!, {
        limit: Number.isFinite(limit) ? limit : undefined,
        skip: Number.isFinite(skip) ? skip : undefined,
        q,
        archived,
        cursor,
      });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const conv = await conversationService.getById(id, req.userId!);
      const messages = await conversationService.getMessages(id, req.userId!);
      return sendSuccess(res, { conversation: conv, messages });
    } catch (err) {
      next(err);
    }
  };

  export = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const conv = await conversationService.getById(id, req.userId!);
      const messages = await conversationService.getMessages(id, req.userId!);

      const title = conv.title || 'Conversation';
      const exportedAt = new Date().toISOString().slice(0, 10);
      const body = messages
        .map((m) => {
          const who = m.role === 'user' ? '**You**' : '**Quantum AI**';
          return `### ${who}\n\n${m.content}\n`;
        })
        .join('\n---\n\n');

      const markdown = `# ${title}\n\n_Exported from Quantum AI on ${exportedAt}_\n\n---\n\n${body}`;

      const safeName = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'conversation';
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.md"`);
      return res.send(markdown);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const { title, pinned, archived } = req.body ?? {};
      const conv = await conversationService.update(id, req.userId!, {
        title,
        pinned,
        archived,
      });
      return sendSuccess(res, conv);
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await conversationService.delete(getRouteParam(req, 'id'), req.userId!);
      return sendSuccess(res, { deleted: true });
    } catch (err) {
      next(err);
    }
  };

  deleteLastMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const count = req.body?.count != null ? Number(req.body.count) : 1;
      const result = await conversationService.deleteLastMessages(id, req.userId!, count);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  truncateFromMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      const messageId = getRouteParam(req, 'messageId');
      const result = await conversationService.truncateFromMessage(id, req.userId!, messageId);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };
}

export const conversationController = new ConversationController();
