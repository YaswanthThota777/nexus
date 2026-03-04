import express from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../store.js';
import { templatePackSchema } from '../validators.js';

export const templatesRouter = express.Router();

templatesRouter.post('/', (req, res) => {
  const parsed = templatePackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: parsed.error.message } });
  }

  const id = `tpl_${uuid().slice(0, 10)}`;
  const item = {
    id,
    name: parsed.data.name,
    tags: parsed.data.tags,
    template: parsed.data.template,
    createdAt: new Date().toISOString(),
    downloads: 0,
  };

  db.templates.set(id, item);
  return res.status(201).json(item);
});

templatesRouter.get('/', (req, res) => {
  const query = String(req.query.q || '').toLowerCase();
  const tag = String(req.query.tag || '').toLowerCase();

  let items = [...db.templates.values()];

  if (query) {
    items = items.filter((item) => item.name.toLowerCase().includes(query));
  }

  if (tag) {
    items = items.filter((item) => item.tags.some((entry) => entry.toLowerCase() === tag));
  }

  items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.status(200).json({ items });
});

templatesRouter.get('/:templateId', (req, res) => {
  const item = db.templates.get(req.params.templateId);
  if (!item) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Template not found.' } });
  }

  item.downloads += 1;
  return res.status(200).json(item);
});
