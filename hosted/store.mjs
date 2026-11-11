import { AsyncLocalStorage } from 'node:async_hooks';

// Request-scoped binding: simultaneous visitors never share a database context.
export const storage = new AsyncLocalStorage();
const models = new Map();
export class Schema {
  static Types = { ObjectId: String };
  constructor(fields, options = {}) { this.fields = fields; this.options = options; }
  index() {}
}
const plain = value => value && typeof value === 'object' && '_doc' in value ? value._doc : value;
const equal = (a, b) => String(a) === String(b);
function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(doc, part));
    const actual = doc[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if ('$in' in value) return value.$in.some(item => equal(actual, item));
      if ('$gt' in value) return new Date(actual) > new Date(value.$gt);
      return false;
    }
    return Array.isArray(actual) ? actual.some(item => equal(item, value)) : equal(actual, value);
  });
}
function initial(fields, input) {
  const doc = { ...input };
  for (const [key, spec] of Object.entries(fields)) {
    if (doc[key] !== undefined) continue;
    if (Array.isArray(spec) || Array.isArray(spec.type)) doc[key] = [];
    else if (spec.default !== undefined) doc[key] = typeof spec.default === 'function' ? spec.default() : spec.default;
  }
  return doc;
}
function validate(fields, data) {
  for (const [key, spec] of Object.entries(fields)) {
    const value = data[key];
    if (spec.required && (value === undefined || value === null || value === '')) throw Object.assign(new Error(`${key} is required`), { status: 400 });
    if (value == null) continue;
    if (spec.enum && !spec.enum.includes(value)) throw Object.assign(new Error(`Invalid ${key}`), { status: 400 });
    if (spec.min !== undefined && value < spec.min || spec.max !== undefined && value > spec.max) throw Object.assign(new Error(`Invalid ${key}`), { status: 400 });
  }
}
async function rows(name) {
  // Preserve insertion order when timestamps tie; SQLite's collection index is
  // otherwise ordered by our random IDs, which can put a reply before its parent.
  const { results } = await storage.getStore().DB.prepare('SELECT data FROM records WHERE collection = ? ORDER BY rowid ASC').bind(name).all();
  return results.map(row => JSON.parse(row.data));
}
async function persist(name, doc) {
  await storage.getStore().DB.prepare('INSERT INTO records(collection,id,data) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data').bind(name, doc._id, JSON.stringify(doc)).run();
}
async function populateDoc(model, document, options, select) {
  const path = typeof options === 'string' ? options : options.path;
  const field = model.schema.fields[path];
  const reference = (Array.isArray(field) ? field[0] : field)?.ref;
  if (!reference) return;
  const target = models.get(reference);
  const transform = async id => {
    let record = await target.findById(typeof id === 'object' ? id._id : id);
    if (!record) return null;
    if (options.populate) record = await record.populate(options.populate);
    const projection = select || options.select;
    if (projection) return Object.fromEntries(['_id', ...projection.split(' ')].filter(key => record[key] !== undefined).map(key => [key, record[key]]));
    return record;
  };
  document[path] = Array.isArray(document[path]) ? (await Promise.all(document[path].map(transform))).filter(Boolean) : document[path] ? await transform(document[path]) : null;
}
class Query {
  constructor(model, filter, one = false) { Object.assign(this, { model, filter, one, populates: [] }); }
  sort(order) { this.order = order; return this; }
  select(fields) { this.fields = fields; return this; }
  populate(...args) { this.populates.push(args); return this; }
  lean() { this.asPlain = true; return this; }
  async execute() {
    let data = (await rows(this.model.modelName)).filter(doc => matches(doc, this.filter));
    if (this.order) data.sort((a, b) => { for (const [key, direction] of Object.entries(this.order)) { if (a[key] !== b[key]) return (a[key] > b[key] ? 1 : -1) * direction; } return 0; });
    data = await Promise.all(data.map(async item => {
      const doc = new this.model(item);
      for (const args of this.populates) await populateDoc(this.model, doc, ...args);
      if (this.fields) return Object.fromEntries(['_id', ...this.fields.split(' ')].filter(key => doc[key] !== undefined).map(key => [key, doc[key]]));
      return this.asPlain ? doc._doc : doc;
    }));
    return this.one ? data[0] || null : data;
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}
export function model(name, schema) {
  if (models.has(name)) return models.get(name);
  class Document {
    static schema = schema;
    static modelName = name;
    constructor(input) { Object.assign(this, initial(schema.fields, input)); }
    get _doc() { return Object.fromEntries(Object.entries(this).map(([key, value]) => [key, plain(value)])); }
    toJSON() { return this._doc; }
    async save() {
      validate(schema.fields, this);
      this._id ||= crypto.randomUUID().replaceAll('-', '').slice(0, 24);
      if (schema.options.timestamps) { this.createdAt ||= new Date().toISOString(); this.updatedAt = new Date().toISOString(); }
      await persist(name, this._doc);
      return this;
    }
    async populate(...args) { await populateDoc(Document, this, ...args); return this; }
    static find(filter = {}) { return new Query(Document, filter); }
    static findOne(filter) { return new Query(Document, filter, true); }
    static findById(id) { return Document.findOne({ _id: String(id) }); }
    static async create(input) { return new Document(input).save(); }
    static async insertMany(input) { const created = []; for (const item of input) created.push(await Document.create(item)); return created; }
    static async exists(filter) { return !!(await Document.findOne(filter)); }
    static async countDocuments(filter) { return (await Document.find(filter)).length; }
    static async deleteMany(filter) {
      const docs = await Document.find(filter);
      if (docs.length) await storage.getStore().DB.batch(docs.map(doc => storage.getStore().DB.prepare('DELETE FROM records WHERE collection=? AND id=?').bind(name, doc._id)));
      return { deletedCount: docs.length };
    }
    static async findByIdAndDelete(id) { const doc = await Document.findById(id); if (doc) await Document.deleteMany({ _id: id }); return doc; }
    static async findOneAndUpdate(filter, update, options = {}) {
      let doc = await Document.findOne(filter);
      if (!doc && !options.upsert) return null;
      doc ||= new Document(filter);
      if (update.$set) Object.assign(doc, update.$set);
      else for (const [key, value] of Object.entries(update)) if (!key.startsWith('$')) doc[key] = value;
      if (update.$pull) for (const [key, value] of Object.entries(update.$pull)) doc[key] = (doc[key] || []).filter(item => !equal(item, value));
      return doc.save();
    }
    static findByIdAndUpdate(id, update, options) { return Document.findOneAndUpdate({ _id: String(id) }, update, options); }
    static async updateOne(filter, update) { const doc = await Document.findOneAndUpdate(filter, update); return { matchedCount: doc ? 1 : 0 }; }
    static async updateMany(filter, update) { for (const doc of await Document.find(filter)) await Document.findOneAndUpdate({ _id: doc._id }, update); }
  }
  models.set(name, Document);
  return Document;
}
export default { Schema, model };
