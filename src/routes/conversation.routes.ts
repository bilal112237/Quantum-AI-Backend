import { Router } from 'express';
import { conversationController } from '../controllers/ConversationController.js';
import { authenticate } from '../middleware/index.js';
import { validateBody, validateParams } from '../validators/index.js';
import {
  createConversationSchema,
  deleteLastMessagesSchema,
  objectIdParamSchema,
  updateConversationSchema,
} from '../validators/schemas.js';
import { z } from 'zod';

const router = Router();

const messageIdParamSchema = z.object({
  id: z.string().min(1),
  messageId: z.string().min(1),
});

router.use(authenticate);

router.post('/', validateBody(createConversationSchema), conversationController.create);
router.get('/', conversationController.list);
router.get('/:id', validateParams(objectIdParamSchema), conversationController.get);
router.get('/:id/export', validateParams(objectIdParamSchema), conversationController.export);
router.patch(
  '/:id',
  validateParams(objectIdParamSchema),
  validateBody(updateConversationSchema),
  conversationController.update
);
router.delete('/:id', validateParams(objectIdParamSchema), conversationController.remove);
router.post(
  '/:id/messages/delete-last',
  validateParams(objectIdParamSchema),
  validateBody(deleteLastMessagesSchema),
  conversationController.deleteLastMessages
);
router.delete(
  '/:id/messages/from/:messageId',
  validateParams(messageIdParamSchema),
  conversationController.truncateFromMessage
);

export default router;
